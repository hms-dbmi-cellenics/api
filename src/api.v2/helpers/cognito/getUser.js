const config = require('../../../config');
const getAwsPoolId = require('./getAwsPoolId');

async function getUser(userFilterValue, userFilterKey) {
  const pId = await getAwsPoolId();

  const params = {
    UserPoolId: pId,
    AttributesToGet: [
      'sub',
      'name',
      'email',
      'email_verified',
    ],
    Filter: `${userFilterKey} = "${userFilterValue}"`,
  };

  const { Users } = await config.cognitoISP.listUsers(params).promise();
  const { UserAttributes } = Users[0];
  return UserAttributes;
}


module.exports = getUser;
