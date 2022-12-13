const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');
const util = require('util');

const config = require('../../../../config');
const {
  QC_PROCESS_NAME, GEM2S_PROCESS_NAME, SUBSET_PROCESS_NAME,
} = require('../../../constants');

const Experiment = require('../../../model/Experiment');
const ExperimentExecution = require('../../../model/ExperimentExecution');

const getLogger = require('../../../../utils/getLogger');

const {
  getGem2sPipelineSkeleton, getQcPipelineSkeleton, getSubsetPipelineSkeleton,
} = require('./skeletons');
const { getQcStepsToRun } = require('./qcHelpers');
const needsBatchJob = require('../batch/needsBatchJob');

const {
  buildStateMachineDefinition,
  executeStateMachine,
  createActivity,
  createNewStateMachine,
  cancelPreviousPipelines,
  getClusterInfo,
  getPipelineArtifacts,
} = require('./utils');


const logger = getLogger();

const createQCPipeline = async (experimentId, processingConfigUpdates, authJWT, previousJobId) => {
  const accountId = config.awsAccountId;
  const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;
  logger.log(`createQCPipeline: fetch processing settings ${experimentId}`);

  const experiment = await new Experiment().findById(experimentId).first();

  const {
    processingConfig, samplesOrder,
  } = experiment;

  const { podCpus, podMemory } = await new Experiment().getResourceRequirements(experimentId);


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
    podCpus,
    podMemory,
  };

  await cancelPreviousPipelines(experimentId, previousJobId);

  const qcSteps = await getQcStepsToRun(experimentId, processingConfigUpdates);
  const runInBatch = needsBatchJob(podCpus, podMemory);

  const qcPipelineSkeleton = await getQcPipelineSkeleton(
    config.clusterEnv,
    qcSteps,
    runInBatch,
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

  const { podCpus, podMemory } = await new Experiment().getResourceRequirements(experimentId);

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
    podCpus,
    podMemory,
  };

  await cancelPreviousPipelines(experimentId);

  const runInBatch = needsBatchJob(podCpus, podMemory);

  const gem2sPipelineSkeleton = getGem2sPipelineSkeleton(config.clusterEnv, runInBatch);
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

const createSubsetPipeline = async (fromExperimentId, toExperimentId, cellSetKeys) => {
  const accountId = config.awsAccountId;
  const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;

  const { podCpus, podMemory } = await new Experiment().getResourceRequirements(fromExperimentId);

  const taskParams = {
    cellSetKeys,
    parentExperimentId: fromExperimentId,
    subsetExperimentId: toExperimentId,
  };

  const context = {
    experimentId: fromExperimentId,
    accountId,
    roleArn,
    processName: SUBSET_PROCESS_NAME,
    activityArn: `arn:aws:states:${config.awsRegion}:${accountId}:activity:pipeline-${config.clusterEnv}-${uuidv4()}`,
    pipelineArtifacts: await getPipelineArtifacts(),
    clusterInfo: await getClusterInfo(),
    sandboxId: config.sandboxId,
    environment: config.clusterEnv,
    podCpus,
    podMemory,
    taskParams: {
      subsetSeurat: {},
      prepareExperiment: taskParams,
      uploadToAWS: taskParams,
    },
  };

  // Don't allow gem2s, qc runs doing changes on the data we need to perform the subset
  // This also cancels other subset pipeline runs on the same from experiment,
  //  need to check if that is fine
  await cancelPreviousPipelines(fromExperimentId);

  logger.log(`createSubsetPipeline: not passing cpu/mem ${podCpus}, ${podMemory}`);
  const subsetPipelineSkeleton = getSubsetPipelineSkeleton(config.clusterEnv);
  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(subsetPipelineSkeleton, context);
  logger.log('State machine definition built, now creating activity if not already present...');

  const activityArn = await createActivity(context);
  logger.log(`Activity with ARN ${activityArn} created, now creating state machine from skeleton...`);

  const stateMachineArn = await createNewStateMachine(context, stateMachine, SUBSET_PROCESS_NAME);
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
  createSubsetPipeline,
  buildStateMachineDefinition,
};
