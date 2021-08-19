const https = require('https');
const MessageValidator = require('sns-validator');
const { promisify } = require('util');
const logger = require('./logging');
const config = require('../config');

const validator = new MessageValidator();

const parseSNSMessage = async (req) => {
  let msg;
  logger.log('[MSG ??] SNS message of length', req.body.length, 'arrived.');

  // First let's try parsing the body. It should be JSON.
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
  }
  // Notifications are passed on to the service for processing.
  if (msg.Type === 'Notification') {
    try {
      const io = req.app.get('io');
      const parsedMessage = JSON.parse(msg.Message);

      logger.log(`[MSG ${msg.MessageId}] Message sent via SNS is parsed:`);
      logger.log(`[MSG ${msg.MessageId}] ${parsedMessage}`);

      return { io, parsedMessage };
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
