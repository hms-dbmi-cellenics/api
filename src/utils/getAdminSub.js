const config = require('../config');
const getAwsPoolId = require('../api.v2/helpers/cognito/getAwsPoolId');

const getAdminSub = async () => {
  const userPoolId = await getAwsPoolId();
  const result = await config.cognitoISP.adminGetUser({
    Username: 'admin@biomage.net',
    UserPoolId: userPoolId,
  }).promise();

  return result.Username;
};

module.exports = getAdminSub;
