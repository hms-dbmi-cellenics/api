const _ = require('lodash');
const util = require('util');

const config = require('../../../../config');
const {
  QC_PROCESS_NAME, GEM2S_PROCESS_NAME, SUBSET_PROCESS_NAME, SEURAT_PROCESS_NAME,
} = require('../../../constants');

const CellLevelMeta = require('../../../model/CellLevelMeta');
const Experiment = require('../../../model/Experiment');
const ExperimentExecution = require('../../../model/ExperimentExecution');

const getLogger = require('../../../../utils/getLogger');

const {
  getGem2sPipelineSkeleton,
  getQcPipelineSkeleton,
  getSubsetPipelineSkeleton,
  getSeuratPipelineSkeleton,
  getCopyPipelineSkeleton,
} = require('./skeletons');
const { getQcStepsToRun, qcStepsWithFilterSettings } = require('./qcHelpers');
const needsBatchJob = require('../batch/needsBatchJob');

const {
  executeStateMachine,
  createActivity,
  createNewStateMachine,
  cancelPreviousPipelines,
  getGeneralPipelineContext,
} = require('./utils');

const buildStateMachineDefinition = require('./constructors/buildStateMachineDefinition');
const getPipelineStatus = require('../getPipelineStatus');
const constants = require('../../../constants');

const logger = getLogger();

/**
 *
 * @param {*} processingConfig The processing config with defaultFilterSettings in each step
 * @param {*} samplesOrder The sample ids to iterate over
 * @returns The processing config without defaultFilterSettings in each step
 */
const withoutDefaultFilterSettings = (processingConfig, samplesOrder) => {
  const slimmedProcessingConfig = _.cloneDeep(processingConfig);

  qcStepsWithFilterSettings.forEach((stepName) => {
    samplesOrder.forEach((sampleId) => {
      delete slimmedProcessingConfig[stepName][sampleId].defaultFilterSettings;
    });
  });

  return slimmedProcessingConfig;
};

/**
 * Adds a flag to recompute doublet scores in the processingConfig object.
 *
 * This function is a hotfix/workaround and should ideally be handled in the pipeline.
 * It is used in cases when the count distribution changes
 * (e.g., enabling cell size distribution) which may affect the correctness of doublet scores.
 * It checks if the classifier is auto-enabled or cell size distribution is enabled and sets
 * the `recomputeDoubletScore` flag accordingly for each sample in the processingConfig.
 *
 * @param {Object} processingConfig - The processing configuration object containing
 * doubletScores and cellSizeDistribution configurations for each sample.
 */
const withRecomputeDoubletScores = (processingConfig) => {
  const newProcessingConfig = _.cloneDeep(processingConfig);

  // If count distribution changes (i.e. enabled cellsize) recompute the doublet
  // scores in QC for correctness.
  const classifierAutoEnabled = Object.values(
    newProcessingConfig.doubletScores,
  ).some((sample) => sample.auto);

  const cellSizeEnabled = Object.values(
    newProcessingConfig.cellSizeDistribution,
  ).some((sample) => sample.enabled);

  const recomputeDoubletScore = !classifierAutoEnabled || cellSizeEnabled;
  Object.keys(newProcessingConfig.doubletScores).forEach((sample) => {
    // eslint-disable-next-line no-param-reassign
    newProcessingConfig.doubletScores[sample].recomputeDoubletScore = recomputeDoubletScore;
  });

  return newProcessingConfig;
};

const getMetadataS3Path = async (experimentId) => {
  const cellLevelMetadataFiles = await new CellLevelMeta()
    .getMetadataByExperimentIds([experimentId]);
  if (cellLevelMetadataFiles.length > 1) {
    throw new Error(`Experiment ${experimentId} cannot have more than one cell level metadata file`);
  }
  if (cellLevelMetadataFiles.length === 0) {
    return null;
  }
  return cellLevelMetadataFiles[0].id;
};

const createQCPipeline = async (experimentId, processingConfigUpdates, authJWT, previousJobId) => {
  logger.log(`createQCPipeline: fetch processing settings ${experimentId}`);

  const { processingConfig, samplesOrder } = await new Experiment().findById(experimentId).first();
  const {
    // @ts-ignore
    [constants.QC_PROCESS_NAME]: status,
  } = await getPipelineStatus(experimentId, constants.QC_PROCESS_NAME);

  if (processingConfigUpdates.length) {
    processingConfigUpdates.forEach(({ name, body }) => {
      if (!processingConfig[name]) {
        processingConfig[name] = body;

        return;
      }

      _.assign(processingConfig[name], body);
    });
  }

  // workaround to add a flag to recompute doublet scores in the processingConfig object.
  const fullProcessingConfig = withRecomputeDoubletScores(processingConfig);

  // Store the processing config with all changes back in sql
  await new Experiment().updateById(experimentId, { processing_config: fullProcessingConfig });

  const context = {
    ...(await getGeneralPipelineContext(experimentId, QC_PROCESS_NAME)),
    processingConfig: withoutDefaultFilterSettings(fullProcessingConfig, samplesOrder),
    authJWT,
    metadataS3Path: await getMetadataS3Path(experimentId),
  };

  await cancelPreviousPipelines(experimentId, previousJobId);

  const qcSteps = await getQcStepsToRun(
    experimentId, processingConfigUpdates, status.completedSteps,
  );

  const runInBatch = needsBatchJob(context.podCpus, context.podMemory);

  const skeleton = await getQcPipelineSkeleton(
    config.clusterEnv,
    qcSteps,
    runInBatch,
  );

  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(skeleton, context);
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

const createGem2SPipeline = async (experimentId, taskParams, authJWT) => {
  const context = {
    ...(await getGeneralPipelineContext(experimentId, GEM2S_PROCESS_NAME)),
    processingConfig: {},
    taskParams,
    authJWT,
  };

  await cancelPreviousPipelines(experimentId);

  const runInBatch = needsBatchJob(context.podCpus, context.podMemory);

  const skeleton = getGem2sPipelineSkeleton(config.clusterEnv, runInBatch);
  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(skeleton, context);
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

const createSeuratPipeline = async (experimentId, taskParams, authJWT) => {
  const context = {
    ...(await getGeneralPipelineContext(experimentId, SEURAT_PROCESS_NAME)),
    processingConfig: {},
    taskParams,
    authJWT,
  };

  await cancelPreviousPipelines(experimentId);

  const runInBatch = needsBatchJob(context.podCpus, context.podMemory);

  const skeleton = getSeuratPipelineSkeleton(config.clusterEnv, runInBatch);
  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(skeleton, context);
  logger.log('State machine definition built, now creating activity if not already present...');

  const activityArn = await createActivity(context);
  logger.log(`Activity with ARN ${activityArn} created, now creating state machine from skeleton...`);

  const stateMachineArn = await createNewStateMachine(context, stateMachine, SEURAT_PROCESS_NAME);
  logger.log(`State machine with ARN ${stateMachineArn} created, launching it...`);
  logger.log('Context:', util.inspect(context, { showHidden: false, depth: null, colors: false }));
  logger.log('State machine:', util.inspect(stateMachine, { showHidden: false, depth: null, colors: false }));

  const executionArn = await executeStateMachine(stateMachineArn);
  logger.log(`Execution with ARN ${executionArn} created.`);

  return { stateMachineArn, executionArn };
};

const createSubsetPipeline = async (
  fromExperimentId,
  toExperimentId,
  toExperimentName,
  cellSetKeys,
  parentProcessingConfig,
  authJWT,
) => {
  const stepsParams = {
    parentExperimentId: fromExperimentId,
    subsetExperimentId: toExperimentId,
    cellSetKeys,
    parentProcessingConfig,
  };

  // None of the other normal gem2s params are necessary for these 2 steps
  const lastStepsParams = { experimentName: toExperimentName, authJWT };

  const context = {
    ...(await getGeneralPipelineContext(toExperimentId, SUBSET_PROCESS_NAME)),
    taskParams: {
      subsetSeurat: stepsParams,
      prepareExperiment: lastStepsParams,
      uploadToAWS: lastStepsParams,
    },
  };

  // Don't allow gem2s, qc runs doing changes on the data we need to perform the subset
  // This also cancels other subset pipeline runs on the same from experiment,
  //  need to check if that is fine
  await cancelPreviousPipelines(fromExperimentId);

  const runInBatch = needsBatchJob(context.podCpus, context.podMemory);

  const skeleton = getSubsetPipelineSkeleton(config.clusterEnv, runInBatch);
  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(skeleton, context);
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

const createCopyPipeline = async (fromExperimentId, toExperimentId, sampleIdsMap) => {
  const stepsParams = {
    fromExperimentId,
    toExperimentId,
    sampleIdsMap,
  };

  const context = {
    ...(await getGeneralPipelineContext(toExperimentId, constants.COPY_PROCESS_NAME)),
    taskParams: { copyS3Objects: stepsParams },
  };

  const runInBatch = needsBatchJob(context.podCpus, context.podMemory);

  const skeleton = getCopyPipelineSkeleton(config.clusterEnv, runInBatch);
  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(skeleton, context);
  logger.log('State machine definition built, now creating activity if not already present...');

  const activityArn = await createActivity(context);
  logger.log(`Activity with ARN ${activityArn} created, now creating state machine from skeleton...`);

  const stateMachineArn = await createNewStateMachine(
    context, stateMachine, constants.COPY_PROCESS_NAME,
  );
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
  createSeuratPipeline,
  createCopyPipeline,
  buildStateMachineDefinition,
};
