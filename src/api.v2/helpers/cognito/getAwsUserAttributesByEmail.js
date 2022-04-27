const config = require('../../../config');

const { cognitoISP } = config;
async function getAwsUserAttributesByEmail(email) {
  const poolId = await config.awsUserPoolIdPromise;
  const user = await cognitoISP.adminGetUser({ UserPoolId: poolId, Username: email }).promise();
  return user.UserAttributes;
}

module.exports = getAwsUserAttributesByEmail;
