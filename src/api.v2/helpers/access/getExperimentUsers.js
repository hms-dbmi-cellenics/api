const { getAwsUserAttributes } = require('../../../utils/aws/user');

const UserAccess = require('../../model/UserAccess');

const AccessRole = require('../../../utils/enums/AccessRole');

const getExperimentUsers = async (experimentId) => {
  const userData = await new UserAccess().getExperimentUsers(experimentId);

  // Remove admin from user list
  const filteredUsers = userData.filter(
    ({ accessRole }) => accessRole !== AccessRole.ADMIN,
  );

  const requests = filteredUsers.map(async (entry) => {
    try {
      return await getAwsUserAttributes(entry.userId, 'sub');
    } catch (err) {
      console.error(`Error fetching user attributes for user ${entry.userId}: ${err}`);
      return null;
    }
  });

  const cognitoUserData = (await Promise.all(requests)).filter((user) => user !== null);

  const experimentUsers = cognitoUserData.map((userInfo, idx) => {
    const email = userInfo.find((attr) => attr.Name === 'email').Value;
    const nameAttr = userInfo.find((attr) => attr.Name === 'name');
    const name = nameAttr ? nameAttr.Value : email; // If name is not set, use email as name

    const { accessRole } = filteredUsers[idx];

    return {
      name, email, role: accessRole,
    };
  });

  return experimentUsers;
};

module.exports = getExperimentUsers;
