const AWSXRay = require('aws-xray-sdk');

const constants = require('../general-services/pipeline-manage/constants');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');

const ExperimentService = require('./experiment');
const SamplesService = require('./samples');

const experimentService = new ExperimentService();
const samplesService = new SamplesService();
const getPipelineStatus = require('../general-services/pipeline-status');

const gem2sResponse = async (io, message) => {
  AWSXRay.getSegment().addMetadata('message', message);

  // Fail hard if there was an error.
  await validateRequest(message, 'GEM2SResponse.v1.yaml');

  const { item, table: tableName } = message;

  const { experimentId } = item;

  if (tableName.includes('experiments')) {
    await experimentService.updateExperiment(experimentId, item);
  } else if (tableName.includes('samples')) {
    const { projectUuid } = item;
    await samplesService.updateSamples(projectUuid, item);
  }

  const statusRes = await getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME);

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

module.exports = gem2sResponse;
