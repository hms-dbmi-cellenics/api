const getLogger = require('../../../utils/getLogger');
const { OK } = require('../../../utils/responses');

const UserAccess = require('../../model/UserAccess');

const logger = getLogger('[PostRegistrationHandler] - ');

const postRegistrationHandler = async (req) => {
  const { userEmail, userId } = req.body;

  console.log('*** req.body', req.body);

  new UserAccess().registerNewUserAccess(userEmail, userId);

  logger.log(`Post registration handled for user ${userId}`);

  return OK();
};

module.exports = postRegistrationHandler;
