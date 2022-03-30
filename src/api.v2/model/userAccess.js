const _ = require('lodash');

const config = require('../../config');

const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const { isRoleAuthorized } = require('../helpers/roles');

const AccessRole = require('../../utils/enums/AccessRole');
const sqlClient = require('../../sql/sqlClient');

const userAccessTable = 'user_access';

const selectableProps = [
  'user_id',
  'experiment_id',
  'access_role',
  'updated_at',
];

const getLogger = require('../../utils/getLogger');

const logger = getLogger('[UserAccessModel] - ');

const basicModelFunctions = generateBasicModelFunctions({
  tableName: userAccessTable,
  selectableProps,
});

const createNewExperimentPermissions = async (userId, experimentId) => {
  logger.log('Setting up access permissions for experiment');

  await basicModelFunctions.create(
    { user_id: config.adminSub, experiment_id: experimentId, access_role: AccessRole.ADMIN },
  );

  if (userId === config.adminSub) {
    logger.log('User is the admin, so only creating admin access');
    return;
  }

  await basicModelFunctions.create(
    { user_id: userId, experiment_id: experimentId, access_role: AccessRole.OWNER },
  );
};

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

  const { accessRole: role } = result;

  return isRoleAuthorized(role, url, method);
};

module.exports = {
  createNewExperimentPermissions,
  canAccessExperiment,
  ...basicModelFunctions,
};
