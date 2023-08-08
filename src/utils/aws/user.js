const getUser = require('../../api.v2/helpers/cognito/getUser');

async function getAwsUserAttributes(userFilterValue, userFilterKey) {
  const user = await getUser(userFilterValue, userFilterKey);
  return user;
}

module.exports = { getAwsUserAttributes };
