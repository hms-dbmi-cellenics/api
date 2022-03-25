const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');

const { isRoleAuthorized } = require('../helpers/roles');

const userAccessTable = 'user_access';

const selectableProps = [
  'user_id',
  'experiment_id',
  'access_role',
  'updated_at',
];

const basicModelFunctions = generateBasicModelFunctions({
  tableName: userAccessTable,
  selectableProps,
});

const canAccessExperiment = async (userId, experimentId, url, method) => {
  const results = await sqlClient.get()
    .select()
    .from(userAccessTable)
    .where({ experiment_id: experimentId, user_id: userId });

  // If there is no entry for this user and role, then user definitely doesn't have access
  if (results.length === 0) {
    return false;
  }

  const { access_role: role } = results[0];

  return isRoleAuthorized(role, url, method);
};

module.exports = {
  canAccessExperiment,
  ...basicModelFunctions,
};
