const AWSXRay = require('aws-xray-sdk');

const constants = require('../general-services/pipeline-manage/constants');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');

const ExperimentService = require('./experiment');
const SamplesService = require('./samples');

const experimentService = new ExperimentService();
const samplesService = new SamplesService();
const getPipelineStatus = require('../general-services/pipeline-status');

const sendUpdateToSubscribed = async (experimentId, message, io) => {
  const statusRes = await getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME);

  // How do we handle errors? TODO This needs to be handled
  // if (statusRes.gem2s) {
  //   AWSXRay.getSegment().addError(error);
  //   io.sockets.emit(`ExperimentUpdates-${experimentId}`, message);
  //   return;
  // }

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusRes,
    type: 'gem2s',
  };

  logger.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const gem2sResponse = async (io, message) => {
  console.log(`message gem2s ${message}`);
  AWSXRay.getSegment().addMetadata('message', message);

  // Fail hard if there was an error.
  await validateRequest(message, 'GEM2SResponse.v1.yaml');

  const { experimentId } = message;

  if (!message.table) {
    await sendUpdateToSubscribed(experimentId, message, io);
    return;
  }

  const { item, table: tableName } = message;

  if (tableName.includes('experiments')) {
    await experimentService.updateExperiment(experimentId, item);
  } else if (tableName.includes('samples')) {
    const { projectUuid } = item;
    await samplesService.updateSamples(projectUuid, item);
  }

  await sendUpdateToSubscribed(experimentId, message, io);
};

module.exports = gem2sResponse;
