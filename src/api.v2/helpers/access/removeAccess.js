const { getAwsUserAttributes } = require('../../../utils/aws/user');

const UserAccess = require('../../model/UserAccess');

const removeAccess = async (experimentId, userEmail) => {
  const userAttributes = await getAwsUserAttributes(userEmail, 'email');
  const userId = userAttributes.find((attr) => attr.Name === 'sub').Value;

  new UserAccess().removeAccess(userId, experimentId);
};

module.exports = removeAccess;
