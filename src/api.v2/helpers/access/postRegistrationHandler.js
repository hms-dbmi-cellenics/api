const parseSNSMessage = require('../../../utils/parse-sns-message');
const getLogger = require('../../../utils/getLogger');

const UserAccess = require('../../model/UserAccess');

const logger = getLogger('[PostRegistrationHandler] - ');

const postRegistrationHandler = async (req) => {
  let data;

  try {
    const { parsedMessage } = await parseSNSMessage(req);
    data = parsedMessage;
  } catch (e) {
    logger.error('Parsing initial SNS message failed:', e);
    return;
  }

  const { userEmail, userId } = data;

  new UserAccess().registerNewUserAccess(userEmail, userId);

  logger.log(`Post registration handled for user ${userId}`);
};

module.exports = postRegistrationHandler;
