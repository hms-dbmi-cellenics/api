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
const { qcStepsWithFilterSettings } = require('../../enums');

const logger = getLogger('[Gem2sService] - ');

const hookRunner = new HookRunner();

const addDefaultFilterSettings = async (experimentId, processingConfig) => {
  const { samplesOrder } = await new Experiment().findById(experimentId).first();

  const processingConfigToReturn = _.cloneDeep(processingConfig);

  logger.log('Adding defaultFilterSettings to received processing config');

  qcStepsWithFilterSettings.forEach((stepName) => {
    const processingConfigStep = processingConfigToReturn[stepName];

    samplesOrder.forEach((sampleId) => {
      const sampleSettings = processingConfigStep[sampleId];

      // eslint-disable-next-line no-param-reassign
      sampleSettings.defaultFilterSettings = _.cloneDeep(sampleSettings.filterSettings);
    });
  });

  logger.log('Finished adding defaultFilterSettings to received processing config');

  return processingConfigToReturn;
};

const continueToQC = async (payload) => {
  const { experimentId, item, jobId } = payload;

  const processingConfigWithDefaults = await addDefaultFilterSettings(
    experimentId, item.processingConfig,
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

hookRunner.register('uploadToAWS', [
  continueToQC,
]);

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

const generateGem2sParams = async (experimentId, authJWT) => {
  const defaultMetadataValue = 'N.A.';

  logger.log('Generating gem2s params');

  const getS3Paths = (files) => {
    const s3Paths = {};
    Object.keys(files).forEach((key) => {
      s3Paths[key] = files[key].s3Path;
    });
    return s3Paths;
  };

  const [experiment, samples] = await Promise.all([
    new Experiment().findById(experimentId).first(),
    new Sample().getSamples(experimentId),
  ]);

  const samplesInOrder = experiment.samplesOrder.map(
    (sampleId) => _.find(samples, { id: sampleId }),
  );

  const s3Paths = {};
  const sampleOptions = {};

  experiment.samplesOrder.forEach((sampleId) => {
    const { files, options } = _.find(samples, { id: sampleId });

    s3Paths[sampleId] = getS3Paths(files);
    sampleOptions[sampleId] = options || {};
  });

  const taskParams = {
    projectId: experimentId,
    experimentName: experiment.name,
    organism: null,
    input: { type: samples[0].sampleTechnology },
    sampleIds: experiment.samplesOrder,
    sampleNames: _.map(samplesInOrder, 'name'),
    sampleS3Paths: s3Paths,
    sampleOptions,
    authJWT,
  };

  const metadataKeys = Object.keys(samples[0].metadata);

  if (metadataKeys.length) {
    logger.log('Adding metadatakeys to task params');

    taskParams.metadata = metadataKeys.reduce((acc, key) => {
      // Make sure the key does not contain '-' as it will cause failure in GEM2S
      const sanitizedKey = key.replace(/-+/g, '_');

      acc[sanitizedKey] = Object.values(samplesInOrder).map(
        (sampleValue) => sampleValue.metadata[key] || defaultMetadataValue,
      );

      return acc;
    }, {});
  }

  logger.log('Task params generated');

  return taskParams;
};

const startGem2sPipeline = async (experimentId, body, authJWT) => {
  logger.log('Creating GEM2S params...');
  const { paramsHash } = body;

  const taskParams = await generateGem2sParams(experimentId, authJWT);

  const { stateMachineArn, executionArn } = await createGem2SPipeline(experimentId, taskParams);

  logger.log('GEM2S params created.');

  const newExecution = {
    params_hash: paramsHash,
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

  await hookRunner.run(message);

  const { experimentId } = message;

  const messageForClient = _.cloneDeep(message);

  if (messageForClient.taskName === 'uploadToAWS') {
    messageForClient.item.processingConfig = await addDefaultFilterSettings(
      experimentId,
      messageForClient.item.processingConfig,
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
