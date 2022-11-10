const config = require('../../../config');
const getAwsPoolId = require('./getAwsPoolId');


async function getUser(email) {
  const pId = await getAwsPoolId();
  const params = { UserPoolId: pId, Username: email };
  const { UserAttributes } = await config.cognitoISP.adminGetUser(params).promise();
  return UserAttributes;
}

module.exports = getUser;
