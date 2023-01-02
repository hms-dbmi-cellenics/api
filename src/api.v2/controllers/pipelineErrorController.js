const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');

const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');
const getPipelineStatus = require('../helpers/pipeline/getPipelineStatus');
const sendNotification = require('../helpers/pipeline/hooks/sendNotification');

const logger = getLogger('[PipelineErrorController] - ');

const updateExperimentErrorState = async (message, io) => {
  const { experimentId, input: { processName } } = message;

  const statusRes = await getPipelineStatus(experimentId, processName);
  const messageForClient = _.cloneDeep(message);

  // Make sure authJWT doesn't get back to the client
  delete messageForClient.authJWT;
  delete messageForClient.input.authJWT;

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusRes,
    type: processName,
  };

  const { error = null } = message.response || {};
  if (error) {
    logger.log(`Error in ${processName} received`);
    AWSXRay.getSegment().addError(error);
  }

  logger.log('Sending pipeline error to all clients subscribed to experiment', experimentId);

  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const handleResponse = async (req, res) => {
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

  const isSnsNotification = parsedMessage !== undefined;
  if (isSnsNotification) {
    try {
      await updateExperimentErrorState(parsedMessage, io);
      await sendNotification(parsedMessage);
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
