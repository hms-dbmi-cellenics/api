const _ = require('lodash');

const getPipelineStatus = require('./getPipelineStatus');
const { createSeuratPipeline } = require('./pipelineConstruct');

const Sample = require('../../model/Sample');
const Experiment = require('../../model/Experiment');
const ExperimentExecution = require('../../model/ExperimentExecution');

const sendNotification = require('./hooks/sendNotification');
const HookRunner = require('./hooks/HookRunner');

const validateRequest = require('../../../utils/schema-validator');
const getLogger = require('../../../utils/getLogger');

const { getGem2sParams, formatSamples } = require('./shouldGem2sRerun');

const logger = getLogger('[SeuratService] - ');

const { SEURAT_PROCESS_NAME } = require('../../constants');

const hookRunner = new HookRunner();

const ExperimentParent = require('../../model/ExperimentParent');
const { MethodNotAllowedError } = require('../../../utils/responses');

const updateProcessingConfig = async (payload) => {
  const { experimentId, item } = payload;

  await new Experiment().updateById(experimentId, { processing_config: item.processingConfig });

  logger.log(`Experiment: ${experimentId}. Saved processing config received from seurat`);
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

hookRunner.register('subsetSeurat', [setupSubsetSamples]);
hookRunner.register('uploadSeuratToAWS', [
  updateProcessingConfig,
]);


hookRunner.registerAll([sendNotification]);

const sendUpdateToSubscribed = async (experimentId, message, io) => {
  const statusRes = await getPipelineStatus(experimentId, SEURAT_PROCESS_NAME);

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusRes,
    type: SEURAT_PROCESS_NAME,
  };

  const { error = null } = message.response || {};
  if (error) {
    logger.log(`Error in ${SEURAT_PROCESS_NAME} received`);
  }

  logger.log('Sending to all clients subscribed to experiment', experimentId);

  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const generateSeuratTaskParams = async (experimentId, rawSamples, authJWT) => {
  logger.log('Generating seurat params');
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

const startSeuratPipeline = async (params, authJWT) => {
  logger.log('Creating SEURAT params...');
  const { experimentId } = params;
  const samples = await new Sample().getSamples(experimentId);

  const currentSeuratParams = await getGem2sParams(experimentId, samples);
  const taskParams = await generateSeuratTaskParams(experimentId, samples, authJWT);

  const {
    stateMachineArn,
    executionArn,
  } = await createSeuratPipeline(experimentId, taskParams, authJWT);

  logger.log('SEURAT params created.');

  const newExecution = {
    last_pipeline_params: currentSeuratParams,
    state_machine_arn: stateMachineArn,
    execution_arn: executionArn,
  };

  // Save execution params
  await new ExperimentExecution().updateExecution(
    experimentId,
    SEURAT_PROCESS_NAME,
    newExecution,
    params,
  );
  logger.log('SEURAT params saved.');

  return newExecution;
};

const handleSeuratResponse = async (io, message) => {
  // Fail hard if there was an error.
  await validateRequest(message, 'SeuratResponse.v2.yaml');

  await hookRunner.run(message);

  const { experimentId } = message;

  const messageForClient = _.cloneDeep(message);

  // Make sure authJWT doesn't get back to the client
  delete messageForClient.authJWT;
  delete messageForClient.input.authJWT;

  await sendUpdateToSubscribed(experimentId, messageForClient, io);
};

const runSeurat = async (params, authorization) => {
  const { experimentId } = params;

  logger.log(`Starting seurat for experiment ${experimentId}`);

  const { parentExperimentId = null } = await new ExperimentParent()
    .find({ experiment_id: experimentId })
    .first();

  if (parentExperimentId) {
    throw new MethodNotAllowedError(`Experiment ${experimentId} can't run seurat`);
  }

  const newExecution = await startSeuratPipeline(params, authorization);

  logger.log(`Started seurat for experiment ${experimentId} successfully, `);
  logger.log('New executions data:');
  logger.log(JSON.stringify(newExecution));
};

module.exports = {
  runSeurat,
  startSeuratPipeline,
  handleSeuratResponse,
};
