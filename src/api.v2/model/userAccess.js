const _ = require('lodash');

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
  const sql = sqlClient.get();

  const result = await sql(userAccessTable)
    .first()
    .where({ experiment_id: experimentId, user_id: userId })
    .from(userAccessTable);

  // If there is no entry for this user and role, then user definitely doesn't have access
  if (_.isNil(result)) {
    return false;
  }

  const { access_role: role } = result;

  return isRoleAuthorized(role, url, method);
};

module.exports = {
  canAccessExperiment,
  ...basicModelFunctions,
};
