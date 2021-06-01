const AWSXRay = require('aws-xray-sdk');

const getPipelineStatus = require('../general-services/pipeline-status');
const constants = require('../general-services/pipeline-manage/constants');
const saveProcessingConfigFromGem2s = require('../../utils/hooks/saveProcessingConfigFromGem2s');
const runQCPipeline = require('../../utils/hooks/runQCPipeline');

const logger = require('../../utils/logging');
const validateRequest = require('../../utils/schema-validator');

const PipelineHook = require('../../utils/hookRunner');

const pipelineHook = new PipelineHook();


pipelineHook.register('uploadToAWS', [saveProcessingConfigFromGem2s, runQCPipeline]);

const sendUpdateToSubscribed = async (experimentId, message, io) => {
  const statusRes = await getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME);

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusRes,
    type: 'gem2s',
  };

  const { error = null } = message.response || {};

  if (error) {
    logger.log('Error in gem2s received');

    AWSXRay.getSegment().addError(error);
  }

  logger.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const gem2sResponse = async (io, message) => {
  AWSXRay.getSegment().addMetadata('message', message);

  // Fail hard if there was an error.
  await validateRequest(message, 'GEM2SResponse.v1.yaml');

  const {
    experimentId, taskName, item,
  } = message;

  await pipelineHook.run(taskName, {
    experimentId,
    item,
  });

  await sendUpdateToSubscribed(experimentId, message, io);
};

module.exports = gem2sResponse;
