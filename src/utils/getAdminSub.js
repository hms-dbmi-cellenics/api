const config = require('../config');
const getAwsPoolId = require('../api.v2/helpers/cognito/getAwsPoolId');

const adminEmail = 'admin@biomage.net';
const backupAdminSub = '00000000-0000-0000-0000-000000000000';

const getAdminSub = async () => {
  const userPoolId = await getAwsPoolId();

  try {
    const result = await config.cognitoISP.adminGetUser({
      Username: adminEmail,
      UserPoolId: userPoolId,
    }).promise();

    return result.Username;
  } catch (e) {
    if (e.message.match(/User does not exist/)) {
      console.log(`Admin account does not exist in deployment. Create admin account with email ${adminEmail} in userpool ${userPoolId}.`);

      return backupAdminSub;
    }

    throw (e);
  }
};

module.exports = getAdminSub;
