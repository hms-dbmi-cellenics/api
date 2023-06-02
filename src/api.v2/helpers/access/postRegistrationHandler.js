const getLogger = require('../../../utils/getLogger');

const UserAccess = require('../../model/UserAccess');

const logger = getLogger('[PostRegistrationHandler] - ');

const postRegistrationHandler = async (req) => {
  const { userEmail, userId } = req.body;

  new UserAccess().registerNewUserAccess(userEmail, userId);

  logger.log(`Post registration handled for user ${userId}`);
};

module.exports = postRegistrationHandler;
