const https = require('https');
const MessageValidator = require('sns-validator');
const { promisify } = require('util');
const logger = require('./logging');
const config = require('../config');

const validator = new MessageValidator();

const parseSNSMessage = async (req) => {
  let msg;
  logger.log('SNS message of length', req.body.length, 'arrived, parsing...');

  // First let's try parsing the body. It should be JSON.
  try {
    msg = JSON.parse(req.body);
  } catch (error) {
    logger.trace('Parsing error: ', error);
    throw error;
  }

  // Asynchronously validate and process the message.
  const validate = promisify(validator.validate).bind(validator);

  try {
    msg = await validate(msg);
  } catch (err) {
    if (config.clusterEnv === 'development') {
      logger.log('Error was thrown in development, ignoring it as expected.');
    } else {
      logger.error('Error validating the SNS response:', err);
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
    logger.log('SNS message is of type notification, sending to the handler...');

    try {
      const io = req.app.get('io');
      const parsedMessage = JSON.parse(msg.Message);

      logger.log('Message sent via SNS is parsed:', parsedMessage);

      return { io, parsedMessage };
    } catch (e) {
      logger.error('Error parsing message:', e);
      throw e;
    }
  }

  return {};
};

module.exports = parseSNSMessage;
