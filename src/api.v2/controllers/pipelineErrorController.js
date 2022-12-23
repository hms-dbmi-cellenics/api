// const { OK } = require('../../utils/responses');
const AWSXRay = require('aws-xray-sdk');

const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');
const constants = require('../../utils/constants');
const getPipelineStatus = require('../helpers/pipeline/getPipelineStatus');
const sendNotification = require('../helpers/pipeline/hooks/sendNotification');

const logger = getLogger('[PipelineErrorController] - ');

const insertExperimentError = async (parsedMessage, io) => {
  const { experimentId, message } = parsedMessage;

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

const notifySlack = (parsedMessage) => {
  const { experimentId, message } = parsedMessage;
  const notificationMessage = `Experiment ${experimentId} failed with message ${message}`;
  sendNotification(notificationMessage);
};

const handleResponse = async (req, res) => {
  console.log('*** inside handle response');

  let result;

  try {
    result = await parseSNSMessage(req, snsTopics.WORK_RESULTS);
  } catch (e) {
    logger.error('Parsing initial SNS message failed:', e);
    AWSXRay.getSegment().addError(e);
    res.status(200).send('nok');
    return;
  }

  const { io, parsedMessage } = result;

  console.log('*** parsed message', parsedMessage);

  // Make sure authJWT doesn't get back to the client
  // delete messageForClient.authJWT;
  // delete messageForClient.input.authJWT;

  const isSnsNotification = parsedMessage !== undefined;
  if (isSnsNotification) {
    try {
      insertExperimentError(io, parsedMessage);
      notifySlack(parsedMessage);
    } catch (e) {
      logger.error(
        'pipeline error response handler failed with error: ', e,
      );

      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

module.exports = {
  handleResponse,
};
