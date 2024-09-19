const _ = require('lodash');
const util = require('util');

const Sample = require('../../../model/Sample');

const config = require('../../../../config');
const {
  QC_PROCESS_NAME, GEM2S_PROCESS_NAME, SUBSET_PROCESS_NAME, OBJ2S_PROCESS_NAME,
} = require('../../../constants');

const CellLevelMeta = require('../../../model/CellLevelMeta');
const Experiment = require('../../../model/Experiment');
const ExperimentExecution = require('../../../model/ExperimentExecution');

const getLogger = require('../../../../utils/getLogger');

const {
  getGem2sPipelineSkeleton,
  getQcPipelineSkeleton,
  getSubsetPipelineSkeleton,
  getObj2sPipelineSkeleton,
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
const withRecomputeDoubletScores = async (processingConfig, experimentId) => {
  const newProcessingConfig = _.cloneDeep(processingConfig);

  const sampleModel = new Sample();
  const samples = await sampleModel.find({ experiment_id: experimentId });

  // Create a map of sampleId to sampleTechnology
  const sampleTechMap = samples.reduce((acc, sample) => {
    acc[sample.id] = sample.sampleTechnology;
    return acc;
  }, {});

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
    // Assign sampleTechnology to each entry in doubletScores
    const sampleTechnology = sampleTechMap[sample];
    if (sampleTechnology) {
      newProcessingConfig.doubletScores[sample].sampleTechnology = sampleTechnology;
    }
  });
  return newProcessingConfig;
};

const getClusteringShouldRun = async (
  experimentId, qcSteps, processingConfigDiff, previousRunState,
) => {
  if (Object.keys(processingConfigDiff).length === 0 && previousRunState === 'FAILED') {
    // If the previous run failed and no new changes were introduced, then defer
    //  to the settings from the last run
    const { retryParams: { clusteringShouldRun } } = await new ExperimentExecution().find(
      { experiment_id: experimentId, pipeline_type: QC_PROCESS_NAME },
    ).first();

    return clusteringShouldRun;
  }

  // Otherwise, calculate the new should run based on current state
  const clusteringIsOutdated = qcSteps.length > 1;
  return !_.isNil(processingConfigDiff.configureEmbedding) || clusteringIsOutdated;
};

const getCellLevelMetadataId = async (experimentId) => {
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

/**
 *
 * @param {*} experimentId
 * @param {*} processingConfigDiff The changes that were performed in the
 * processing config in the shape of a diff (mask) object
 * @param {*} authJWT
 * @param {*} previousJobId
 */
const createQCPipeline = async (experimentId, processingConfigDiff, authJWT, previousJobId) => {
  logger.log(`createQCPipeline: fetch processing settings ${experimentId}`);

  const { processingConfig, samplesOrder } = await new Experiment().findById(experimentId).first();

  const currentCellMetadataId = await getCellLevelMetadataId(experimentId);

  const {
    // @ts-ignore
    [constants.QC_PROCESS_NAME]: status,
  } = await getPipelineStatus(experimentId, constants.QC_PROCESS_NAME);

  Object.entries(processingConfigDiff).forEach(([key, stepConfig]) => {
    _.assign(processingConfig[key], stepConfig);
  });

  // workaround to add a flag to recompute doublet scores in the processingConfig object.
  const fullProcessingConfig = await withRecomputeDoubletScores(processingConfig, experimentId);

  // Store the processing config with all changes back in sql
  await new Experiment().updateById(experimentId, { processing_config: fullProcessingConfig });

  await cancelPreviousPipelines(experimentId, previousJobId);

  const qcSteps = await getQcStepsToRun(
    experimentId, Object.keys(processingConfigDiff), status.completedSteps, status.status,
  );

  const clusteringShouldRun = await getClusteringShouldRun(
    experimentId,
    qcSteps,
    processingConfigDiff,
    status.status,
  );

  const context = {
    ...(await getGeneralPipelineContext(experimentId, QC_PROCESS_NAME)),
    processingConfig: withoutDefaultFilterSettings(fullProcessingConfig, samplesOrder),
    clusteringShouldRun,
    metadataS3Path: currentCellMetadataId,
    authJWT,
  };

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
      last_pipeline_params: { cellMetadataId: currentCellMetadataId },
      retry_params: { clusteringShouldRun },
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

const createObj2sPipeline = async (experimentId, taskParams, authJWT) => {
  const context = {
    ...(await getGeneralPipelineContext(experimentId, OBJ2S_PROCESS_NAME)),
    processingConfig: {},
    taskParams,
    authJWT,
  };

  await cancelPreviousPipelines(experimentId);

  const runInBatch = needsBatchJob(context.podCpus, context.podMemory);

  const skeleton = getObj2sPipelineSkeleton(config.clusterEnv, runInBatch);
  logger.log('Skeleton constructed, now building state machine definition...');

  const stateMachine = buildStateMachineDefinition(skeleton, context);
  logger.log('State machine definition built, now creating activity if not already present...');

  const activityArn = await createActivity(context);
  logger.log(`Activity with ARN ${activityArn} created, now creating state machine from skeleton...`);

  const stateMachineArn = await createNewStateMachine(context, stateMachine, OBJ2S_PROCESS_NAME);
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
  parentSampleTechnology,
  authJWT,
) => {
  const stepsParams = {
    parentExperimentId: fromExperimentId,
    subsetExperimentId: toExperimentId,
    cellSetKeys,
    parentProcessingConfig,
  };

  // None of the other normal gem2s params are necessary for these 2 steps except for
  // sample technology, to know whether it is parse or not
  const lastStepsParams = {
    experimentName: toExperimentName,
    authJWT,
    input: { type: parentSampleTechnology },
  };

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
  createObj2sPipeline,
  createCopyPipeline,
  buildStateMachineDefinition,
};
