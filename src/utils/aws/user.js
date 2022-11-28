const getUser = require('../../api.v2/helpers/cognito/getUser');

async function getAwsUserAttributesByEmail(email) {
  const user = await getUser(email);
  return user;
}

module.exports = { getAwsUserAttributesByEmail };
