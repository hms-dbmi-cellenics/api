const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');

const constants = require('../../constants');
const getPipelineStatus = require('./getPipelineStatus');
const { createGem2SPipeline, createQCPipeline } = require('./pipelineConstruct');

const Sample = require('../../model/Sample');
const Experiment = require('../../model/Experiment');
const ExperimentExecution = require('../../model/ExperimentExecution');

const sendNotification = require('./hooks/sendNotification');
const HookRunner = require('./hooks/HookRunner');

const validateRequest = require('../../../utils/schema-validator');
const getLogger = require('../../../utils/getLogger');

const { qcStepsWithFilterSettings } = require('./pipelineConstruct/qcHelpers');
const { getGem2sParams, formatSamples } = require('./shouldGem2sRerun');
const invalidatePlotsForEvent = require('../../../utils/plotConfigInvalidation/invalidatePlotsForEvent');
const events = require('../../../utils/plotConfigInvalidation/events');

const logger = getLogger('[Gem2sService] - ');

const hookRunner = new HookRunner();

/**
 *
 * @param {*} experimentId
 * @param {*} processingConfig The full processing config for an experiment
 * @param {*} defaultProcessingConfig The default processing config for an
 * experiment (when user sets "auto")
 *
 * @returns A copy of processingConfig with each filterSettings entry of defaultProcessingConfig
 * added with defaultFilterSettings key
 */
const formatDefaultFilterSettings = (experimentId, processingConfig, defaultProcessingConfig) => {
  const processingConfigToReturn = _.cloneDeep(processingConfig);

  logger.log('Adding defaultFilterSettings to received processing config');

  qcStepsWithFilterSettings.forEach((stepName) => {
    const stepConfigSplitBySample = Object.entries(processingConfigToReturn[stepName]);

    stepConfigSplitBySample.forEach(([sampleId, sampleSettings]) => {
      if (!sampleSettings.filterSettings) {
        logger.log(`Experiment: ${experimentId}. Skipping current sample config, it doesnt have filterSettings:`);
        logger.log(JSON.stringify(sampleSettings.filterSettings));
        return;
      }

      const defaultFilterSettings = defaultProcessingConfig[stepName][sampleId].filterSettings;

      // eslint-disable-next-line no-param-reassign
      sampleSettings.defaultFilterSettings = _.cloneDeep(defaultFilterSettings);
    });
  });

  logger.log('Finished adding defaultFilterSettings to received processing config');

  return processingConfigToReturn;
};

const continueToQC = async (payload) => {
  const { experimentId, item, jobId } = payload;

  // Before persisting the new processing config,
  // fill it in with default filter settings (to preserve the gem2s-generated settings)
  const processingConfigWithDefaults = formatDefaultFilterSettings(
    experimentId, item.processingConfig, item.defaultProcessingConfig,
  );

  await new Experiment().updateById(
    experimentId, { processing_config: processingConfigWithDefaults },
  );

  logger.log(`Experiment: ${experimentId}. Saved processing config received from gem2s`);

  logger.log(`Experiment: ${experimentId}. Starting qc run because gem2s finished successfully`);

  logger.log(`continueToQc: previous jobId: ${jobId}`);

  // we need to change this once we rework the pipeline message response
  const authJWT = payload.authJWT || payload.input.authJWT;

  await createQCPipeline(experimentId, [], authJWT, jobId);

  logger.log('Started qc successfully');
};

/**
 *
 * Works with the subsetSeurat sns notification, it adds to sql
 * the samples that were just duplicated
 *
 * Within payload, takes a sampleIdMap object with:
 * - keys: ids of parent experiment samples that survived the subset
 * - values: ids of corresponding subset experiment samples
 *
 * @param {*} payload
 *
 */
const setupSubsetSamples = async (payload) => {
  const { sampleIdMap, input: { parentExperimentId, subsetExperimentId } } = payload;

  const {
    samplesOrder: parentSamplesOrder,
  } = await new Experiment().findById(parentExperimentId).first();

  const samplesToCloneIds = parentSamplesOrder.filter((id) => sampleIdMap[id]);

  logger.log(`Cloning retained experiment samples from experiment ${parentExperimentId} into subset: ${subsetExperimentId}`);

  const cloneSamplesOrder = await new Sample().copyTo(
    parentExperimentId, subsetExperimentId, samplesToCloneIds, sampleIdMap,
  );

  await new Experiment().updateById(
    subsetExperimentId,
    { samples_order: JSON.stringify(cloneSamplesOrder) },
  );

  logger.log(`Finished creating samples for new subset experiment: ${subsetExperimentId}`);
  // Add samples that were created
};

const invalidatePlotsForExperiment = async (payload, io) => {
  await invalidatePlotsForEvent(payload.experimentId, events.CELL_SETS_MODIFIED, io.sockets);
};

hookRunner.register('subsetSeurat', [setupSubsetSamples]);
hookRunner.register('uploadToAWS', [continueToQC]);
hookRunner.register('copyS3Objects', [invalidatePlotsForExperiment]);

hookRunner.registerAll([sendNotification]);

const sendUpdateToSubscribed = async (experimentId, message, io) => {
  const statusRes = await getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME);

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusRes,
    type: constants.GEM2S_PROCESS_NAME,
  };

  const { error = null } = message.response || {};
  if (error) {
    logger.log(`Error in ${constants.GEM2S_PROCESS_NAME} received`);
    AWSXRay.getSegment().addError(error);
  }

  logger.log('Sending to all clients subscribed to experiment', experimentId);

  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const generateGem2sTaskParams = async (experimentId, rawSamples, authJWT) => {
  logger.log('Generating gem2s params');
  const experiment = await new Experiment().findById(experimentId).first();
  const {
    sampleTechnology,
    sampleIds,
    sampleNames,
    sampleOptions,
    sampleS3Paths,
    metadata,
  } = formatSamples(rawSamples);

  const sampleOptionsById = sampleIds.reduce((acc, id, index) => ({
    ...acc,
    [id]: sampleOptions[index] || {},
  }), {});

  const taskParams = {
    projectId: experimentId,
    experimentName: experiment.name,
    organism: null,
    input: { type: sampleTechnology },
    sampleIds,
    sampleNames,
    sampleS3Paths,
    sampleOptions: sampleOptionsById,
    authJWT,
  };

  if (Object.keys(metadata).length === 0) return taskParams;

  return {
    ...taskParams,
    metadata,
  };
};

const startGem2sPipeline = async (experimentId, authJWT) => {
  logger.log('Creating GEM2S params...');

  const samples = await new Sample().getSamples(experimentId);

  const currentGem2SParams = await getGem2sParams(experimentId, samples);
  const taskParams = await generateGem2sTaskParams(experimentId, samples, authJWT);

  const {
    stateMachineArn,
    executionArn,
  } = await createGem2SPipeline(experimentId, taskParams, authJWT);

  logger.log('GEM2S params created.');

  const newExecution = {
    last_pipeline_params: currentGem2SParams,
    state_machine_arn: stateMachineArn,
    execution_arn: executionArn,
  };

  const experimentExecutionClient = new ExperimentExecution();

  await experimentExecutionClient.upsert(
    {
      experiment_id: experimentId,
      pipeline_type: 'gem2s',
    },
    newExecution,
  );

  await experimentExecutionClient.delete({
    experiment_id: experimentId,
    pipeline_type: 'qc',
  });

  logger.log('GEM2S params saved.');

  return newExecution;
};

const handleGem2sResponse = async (io, message) => {
  AWSXRay.getSegment().addMetadata('message', message);

  // Fail hard if there was an error.
  await validateRequest(message, 'GEM2SResponse.v2.yaml');

  await hookRunner.run(message, io);

  const { experimentId } = message;

  const messageForClient = _.cloneDeep(message);

  // If we are at uploadToAWS, then a new processingConfig was received
  // Before being returned to the client we need to
  // fill it in with default filter settings (to preserve the gem2s-generated settings)
  if (messageForClient.taskName === 'uploadToAWS') {
    messageForClient.item.processingConfig = formatDefaultFilterSettings(
      experimentId,
      messageForClient.item.processingConfig,
      messageForClient.item.defaultProcessingConfig,
    );
  }

  // Make sure authJWT doesn't get back to the client
  delete messageForClient.authJWT;
  delete messageForClient.input.authJWT;

  await sendUpdateToSubscribed(experimentId, messageForClient, io);
};

module.exports = {
  startGem2sPipeline,
  handleGem2sResponse,
};
