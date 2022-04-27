const config = require('../../../config');

const UserAccess = require('../../model/UserAccess');

const AccessRole = require('../../../utils/enums/AccessRole');

const { cognitoISP } = config;

const getAwsUserAttributesByEmail = async (email) => {
  const poolId = await config.awsUserPoolIdPromise;
  const user = await cognitoISP.adminGetUser({ UserPoolId: poolId, Username: email }).promise();
  return user.UserAttributes;
};

const getUserRoles = async (experimentId) => {
  const userData = await new UserAccess().getExperimentUsers(experimentId);

  // Remove admin from user list
  const filteredUsers = userData.filter(
    ({ accessRole }) => accessRole !== AccessRole.ADMIN,
  );

  const requests = filteredUsers.map(
    async (entry) => getAwsUserAttributesByEmail(entry.userId),
  );

  const cognitoUserData = await Promise.all(requests);

  const experimentUsers = cognitoUserData.map((userInfo, idx) => {
    const email = userInfo.find((attr) => attr.Name === 'email').Value;
    const name = userInfo.find((attr) => attr.Name === 'name').Value;
    const { accessRole } = filteredUsers[idx];

    return {
      name, email, role: accessRole,
    };
  });

  return experimentUsers;
};

module.exports = getUserRoles;
