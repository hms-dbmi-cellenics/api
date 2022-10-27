const https = require('https');
const MessageValidator = require('sns-validator');
const { promisify } = require('util');
const getLogger = require('./getLogger');
const config = require('../config');
const { UnauthorizedError } = require('./responses');

const logger = getLogger();

const validator = new MessageValidator();

const parseSNSMessage = async (req, topicArn) => {
  let msg;

  // First make sure the topic is the one we expect to be receiving from
  logger.log(`[MSG ??] Checking that sns topic is ${topicArn}`);
  if (topicArn !== req.headers['x-amz-sns-topic-arn']) {
    logger.log(`[MSG ??] SNS topic doesn't match: request's topic: ${req.headers['x-amz-sns-topic-arn']}, expected: ${topicArn}`);
    throw new UnauthorizedError('SNS topic doesn\'t match');
  }

  logger.log('[MSG ??] SNS message of length', req.body.length, 'arrived.');

  // Second let's try parsing the body. It should be JSON.
  try {
    msg = JSON.parse(req.body);
  } catch (error) {
    logger.trace('[MSG ??] Error while parsing: ', error);
    throw error;
  }

  // Asynchronously validate and process the message.
  const validate = promisify(validator.validate).bind(validator);

  try {
    msg = await validate(msg);
  } catch (err) {
    if (config.clusterEnv === 'development') {
      logger.log('[MSG ??] Error was thrown in development, ignoring it as expected.');
    } else {
      logger.error('[MSG ??] Error validating the SNS response:', err);
      throw err;
    }
  }


  // Handle subscripton and unsubscription automatically.
  if (config.clusterEnv !== 'development'
    && (msg.Type === 'SubscriptionConfirmation'
      || msg.Type === 'UnsubscribeConfirmation')) {
    https.get(msg.SubscribeURL);

    return { msg };
  }
  // Notifications are passed on to the service for processing.
  if (msg.Type === 'Notification') {
    try {
      const io = req.app.get('io');
      const parsedMessage = JSON.parse(msg.Message);

      logger.log(`[MSG ${msg.MessageId}] Message sent via SNS is parsed:`);
      logger.log(`[MSG ${msg.MessageId}] ${JSON.stringify(parsedMessage, null, 2)}`);

      return { io, parsedMessage, msg };
    } catch (e) {
      logger.error('[MSG ??] Error parsing message:', e);
      throw e;
    }
  } else {
    logger.log(`[MSG ??] Ignoring message of type ${msg.Type}`);
  }

  return {};
};

module.exports = parseSNSMessage;
