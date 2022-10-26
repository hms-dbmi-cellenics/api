const parseSNSMessage = require('../../../utils/parseSNSMessage');
const getLogger = require('../../../utils/getLogger');

const UserAccess = require('../../model/UserAccess');

const logger = getLogger('[PostRegistrationHandler] - ');

const postRegistrationHandler = async (req) => {
  let data;
  let messageType;

  try {
    const { parsedMessage, msg } = await parseSNSMessage(req);
    data = parsedMessage;
    messageType = msg.Type;
  } catch (e) {
    logger.error('Parsing initial SNS message failed:', e);
    return;
  }

  // If this is a subscription confirmation, we can just return.
  if (messageType !== 'Notification') return;

  const { userEmail, userId } = data;

  new UserAccess().registerNewUserAccess(userEmail, userId);

  logger.log(`Post registration handled for user ${userId}`);
};

module.exports = postRegistrationHandler;
