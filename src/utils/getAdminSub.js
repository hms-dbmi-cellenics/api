const config = require('../config');
const getAwsPoolId = require('../api.v2/helpers/cognito/getAwsPoolId');

const adminEmail = 'cellenics_admin@listserv.med.harvard.edu';

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
      console.log(`Admin account does not exist in deployment. Creating admin account with email ${adminEmail} in userpool ${userPoolId}.`);

      const result = await config.cognitoISP.adminCreateUser({
        Username: adminEmail,
        UserPoolId: userPoolId,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: adminEmail },
          { Name: 'name', Value: 'Biomage Admin' },
          { Name: 'email_verified', Value: 'true' },
        ],
      }).promise();

      console.log('Admin account created. Change admin password to login.');

      return result.User.Username;
    }

    throw (e);
  }
};

module.exports = getAdminSub;
