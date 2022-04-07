const _ = require('lodash');

const config = require('../../config');

const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const { isRoleAuthorized } = require('../helpers/roles');

const AccessRole = require('../../utils/enums/AccessRole');

const userAccessTable = 'user_access';
const selectableProps = [
  'user_id',
  'experiment_id',
  'access_role',
  'updated_at',
];

const getLogger = require('../../utils/getLogger');

const logger = getLogger('[UserAccessModel] - ');

class UserAccess extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, userAccessTable, selectableProps);
  }

  async createNewExperimentPermissions(userId, experimentId) {
    logger.log('Setting up access permissions for experiment');

    await this.create(
      { user_id: config.adminSub, experiment_id: experimentId, access_role: AccessRole.ADMIN },
    );

    if (userId === config.adminSub) {
      logger.log('User is the admin, so only creating admin access');
      return;
    }

    await this.create(
      { user_id: userId, experiment_id: experimentId, access_role: AccessRole.OWNER },
    );
  }

  async canAccessExperiment(userId, experimentId, url, method) {
    const result = await this.sql(userAccessTable)
      .first()
      .where({ experiment_id: experimentId, user_id: userId })
      .from(userAccessTable);

    // If there is no entry for this user and role, then user definitely doesn't have access
    if (_.isNil(result)) {
      return false;
    }

    const { accessRole: role } = result;

    return isRoleAuthorized(role, url, method);
  }
}

module.exports = UserAccess;
