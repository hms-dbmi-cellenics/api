const crypto = require('crypto');
const jq = require('node-jq');
const YAML = require('yaml');
const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const util = require('util');

const config = require('../../../../config');
const { QC_PROCESS_NAME, GEM2S_PROCESS_NAME } = require('../../../constants');

const Experiment = require('../../../model/Experiment');
const ExperimentExecution = require('../../../model/ExperimentExecution');

const AWS = require('../../../../utils/requireAWS');
const getLogger = require('../../../../utils/getLogger');
const asyncTimer = require('../../../../utils/asyncTimer');

const constructPipelineStep = require('./constructors/constructPipelineStep');
const { getGem2sPipelineSkeleton, getQcPipelineSkeleton } = require('./skeletons');
const { getQcStepsToRun } = require('./qcHelpers');

const logger = getLogger();

const getPipelineArtifacts = async () => {
  const response = await fetch(
    config.pipelineInstanceConfigUrl,
    {
      method: 'GET',
    },
  );

  const txt = await response.text();
  const manifest = YAML.parseAllDocuments(txt);

  const [chartRef, pipelineRunner] = await Promise.all([
    jq.run(
      '..|objects| select(.metadata != null) | select( .metadata.name | contains("pipeline")) | .spec.chart.ref//empty',
      manifest,
      {
        input: 'json',
        output: 'json',
      },
    ),
    jq.run(
      '..|objects|.["pipelineRunner"].image//empty',
      manifest,
      {
        input: 'json',
        output: 'json',
      },
    ),
  ]);

  return {
    chartRef,
    pipelineRunner,
  };
};

const getClusterInfo = async () => {
  if (config.clusterEnv === 'development') return {};

  const eks = new AWS.EKS({
    region: config.awsRegion,
  });

  const { cluster: info } = await eks.describeCluster({ name: `biomage-${config.clusterEnv}` }).promise();
  const { name, endpoint, certificateAuthority: { data: certAuthority } } = info;

  return {
    name,
    endpoint,
    certAuthority,
  };
};


const createNewStateMachine = async (context, stateMachine, processName) => {
  const { clusterEnv, sandboxId } = config;
  const { experimentId, roleArn, accountId } = context;

  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });

  const pipelineHash = crypto
    .createHash('sha1')
    .update(`${experimentId}-${sandboxId}`)
    .digest('hex');

  const params = {
    name: `biomage-${processName}-${clusterEnv}-${pipelineHash}`,
    roleArn,
    definition: JSON.stringify(stateMachine),
    loggingConfiguration: { level: 'OFF' },
    tags: [
      { key: 'experimentId', value: experimentId },
      { key: 'clusterEnv', value: clusterEnv },
      { key: 'sandboxId', value: sandboxId },
    ],
    type: 'STANDARD',
  };

  let stateMachineArn = null;

  try {
    const response = await stepFunctions.createStateMachine(params).promise();
    stateMachineArn = response.stateMachineArn;
    logger.log('Created state machine...');
  } catch (e) {
    if (e.code !== 'StateMachineAlreadyExists') {
      throw e;
    }

    logger.log('State machine already exists, updating...');

    stateMachineArn = `arn:aws:states:${config.awsRegion}:${accountId}:stateMachine:${params.name}`;

    await stepFunctions.updateStateMachine(
      { stateMachineArn, definition: params.definition, roleArn },
    ).promise();

    /**
     * Wait for some time before the state machine update is returned to the caller.
     * Per https://docs.aws.amazon.com/step-functions/latest/apireference/API_UpdateStateMachine.html:
     *
     * Executions started immediately after calling UpdateStateMachine may use the
     * previous state machine `definition` [...].
     *
     */
    await asyncTimer(3500);
  }

  return stateMachineArn;
};

const executeStateMachine = async (stateMachineArn, execInput = {}) => {
  // when running in aws the step functions use a map step to retry the process
  // of assigning the pipeline to an available pod
  // map steps require an array as input so we declare one (it's value is not used)
  const input = execInput;
  input.retries = ['retry'];

  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });
  const { trace_id: traceId } = AWSXRay.getSegment() || {};

  const { executionArn } = await stepFunctions.startExecution({
    stateMachineArn,
    input: JSON.stringify(input),
    traceHeader: traceId,
  }).promise();

  return executionArn;
};

const createActivity = async (context) => {
  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });

  const { activityArn } = await stepFunctions.createActivity({
    name: context.activityArn.split(/[: ]+/).pop(),
  }).promise();

  return activityArn;
};

const buildStateMachineDefinition = (skeleton, context) => {
  logger.log('Constructing pipeline steps...');
  const stateMachine = _.cloneDeepWith(skeleton, (o) => {
    if (_.isObject(o) && o.XStepType) {
      return _.omit(constructPipelineStep(context, o), ['XStepType', 'XConstructorArgs', 'XNextOnCatch']);
    }
    return undefined;
  });

  return stateMachine;
};

const createQCPipeline = async (experimentId, processingConfigUpdates, authJWT) => {
  const accountId = config.awsAccountId;
  const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;
  logger.log(`Fetching processing settings for ${experimentId}`);

  const experiment = await new Experiment().findById(experimentId).first();

  const {
    processingConfig, samplesOrder, podCPUs, podMem,
  } = experiment;

  if (processingConfigUpdates.length) {
    processingConfigUpdates.forEach(({ name, body }) => {
      if (!processingConfig[name]) {
        processingConfig[name] = body;

        return;
      }

      _.assign(processingConfig[name], body);
    });
  }

  const context = {
    experimentId,
    accountId,
    roleArn,
    processName: QC_PROCESS_NAME,
    activityArn: `arn:aws:states:${config.awsRegion}:${accountId}:activity:pipeline-${config.clusterEnv}-${uuidv4()}`,
    pipelineArtifacts: await getPipelineArtifacts(),
    clusterInfo: await getClusterInfo(),
    sandboxId: config.sandboxId,
    processingConfig,
    environment: config.clusterEnv,
    authJWT,
    podCPUs,
    podMem,
  };

  const qcSteps = await getQcStepsToRun(experimentId, processingConfigUpdates);

  const qcPipelineSkeleton = await getQcPipelineSkeleton(
    config.clusterEnv,
    qcSteps,
    podCPUs,
    podMem,
  );

  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
  logger.log('State machine definition built, now creating activity if not already present...');

  const activityArn = await createActivity(context); // the context contains the activityArn
  logger.log(`Activity with ARN ${activityArn} created, now creating state machine from skeleton...`);

  const stateMachineArn = await createNewStateMachine(context, stateMachine, QC_PROCESS_NAME);
  logger.log(`State machine with ARN ${stateMachineArn} created, launching it...`);
  logger.log('Context:', util.inspect(context, { showHidden: false, depth: null, colors: false }));
  logger.log('State machine:', util.inspect(stateMachine, { showHidden: false, depth: null, colors: false }));

  const execInput = {
    samples: samplesOrder.map((sampleUuid, index) => ({ sampleUuid, index })),
  };

  const executionArn = await executeStateMachine(stateMachineArn, execInput);
  logger.log(`Execution with ARN ${executionArn} created.`);

  await new ExperimentExecution().upsert(
    {
      experiment_id: experimentId,
      pipeline_type: 'qc',
    },
    {
      state_machine_arn: stateMachineArn,
      execution_arn: executionArn,
    },
  );
};

const createGem2SPipeline = async (experimentId, taskParams) => {
  const accountId = config.awsAccountId;
  const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;

  const experiment = await new Experiment().findById(experimentId).first();
  const { podCPUs, podMem } = experiment;

  const context = {
    taskParams,
    experimentId,
    accountId,
    roleArn,
    processName: GEM2S_PROCESS_NAME,
    activityArn: `arn:aws:states:${config.awsRegion}:${accountId}:activity:pipeline-${config.clusterEnv}-${uuidv4()}`,
    pipelineArtifacts: await getPipelineArtifacts(),
    clusterInfo: await getClusterInfo(),
    sandboxId: config.sandboxId,
    processingConfig: {},
    environment: config.clusterEnv,
    podCPUs,
    podMem,
  };

  const gem2sPipelineSkeleton = getGem2sPipelineSkeleton(config.clusterEnv, podCPUs, podMem);
  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
  logger.log('State machine definition built, now creating activity if not already present...');

  const activityArn = await createActivity(context);
  logger.log(`Activity with ARN ${activityArn} created, now creating state machine from skeleton...`);

  const stateMachineArn = await createNewStateMachine(context, stateMachine, GEM2S_PROCESS_NAME);
  logger.log(`State machine with ARN ${stateMachineArn} created, launching it...`);
  logger.log('Context:', util.inspect(context, { showHidden: false, depth: null, colors: false }));
  logger.log('State machine:', util.inspect(stateMachine, { showHidden: false, depth: null, colors: false }));

  const executionArn = await executeStateMachine(stateMachineArn);
  logger.log(`Execution with ARN ${executionArn} created.`);

  return { stateMachineArn, executionArn };
};


module.exports = {
  createQCPipeline,
  createGem2SPipeline,
  buildStateMachineDefinition,
};
