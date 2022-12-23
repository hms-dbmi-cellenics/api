const crypto = require('crypto');
const jq = require('node-jq');
const YAML = require('yaml');
const AWSXRay = require('aws-xray-sdk');
const { v4: uuidv4 } = require('uuid');

const AWS = require('../../../../utils/requireAWS');
const config = require('../../../../config');
const getLogger = require('../../../../utils/getLogger');
const asyncTimer = require('../../../../utils/asyncTimer');

const { deleteExperimentPods } = require('../hooks/podCleanup');
const listJobsToDelete = require('../batch/listJobsToDelete');
const terminateJobs = require('../batch/terminateJobs');
const Experiment = require('../../../model/Experiment');

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

// cancelPreviousPipelines clears any in progress pipeline execution for the
// given experimentId. It deals both with running fargate pods and AWS Batch jobs.
// batch jobs are cleaned up slowly, in order to avoid canceling the gem2s job that
// triggered a QC run, do not attempt to remove jobId
const cancelPreviousPipelines = async (experimentId, previousJobId = null) => {
  // no need to remove anything in development
  if (config.clusterEnv === 'development') return;

  // remove any pipeline pods already assigned to this experiment
  try {
    await deleteExperimentPods(experimentId);
  } catch (e) {
    logger.error(`cancelPreviousPipelines: deleteExperimentPods ${experimentId}: ${e}`);
  }

  logger.log(`cancelPreviousPipelines: excluding ${previousJobId} from cleanup`);
  // remove any active Batch jobs assigned to this experiment
  const jobs = await listJobsToDelete(
    experimentId,
    config.clusterEnv,
    config.awsRegio,
    previousJobId,
  );

  await terminateJobs(jobs, config.awsRegion);
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
  // @ts-ignore
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

// the full activityArn is too long to be used as a tag (> 63 chars)
// so we just send the last part of the arn as the rest can be constructed.
//  E.g.
// arn:aws:states:eu-west-1:242905224710:activity:pipeline-production-01037a63-a801-4ea4-a93e-...
// => pipeline-production-01037a63-a801-4ea4-a93e-def76c1e5bd2
const getActivityId = (activityArn) => {
  const split = activityArn.split(':');
  return split[split.length - 1];
};

const getGeneralPipelineContext = async (experimentId, processName) => {
  const { podCpus, podMemory } = await new Experiment().getResourceRequirements(experimentId);

  return ({
    experimentId,
    accountId: config.awsAccountId,
    processName,
    roleArn: `arn:aws:iam::${config.awsAccountId}:role/state-machine-role-${config.clusterEnv}`,
    activityArn: `arn:aws:states:${config.awsRegion}:${config.awsAccountId}:activity:pipeline-${config.clusterEnv}-${uuidv4()}`,
    pipelineArtifacts: await getPipelineArtifacts(),
    clusterInfo: await getClusterInfo(),
    sandboxId: config.sandboxId,
    environment: config.clusterEnv,
    podCpus,
    podMemory,
  });
};

module.exports = {
  executeStateMachine,
  createActivity,
  getActivityId,
  createNewStateMachine,
  cancelPreviousPipelines,
  getGeneralPipelineContext,
  getPipelineArtifacts,
};
