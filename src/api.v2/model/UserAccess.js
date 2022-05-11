const _ = require('lodash');

const config = require('../../config');

const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const { NotFoundError } = require('../../utils/responses');

const tableNames = require('./tableNames');
const AccessRole = require('../../utils/enums/AccessRole');

const { isRoleAuthorized } = require('../helpers/roles');

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
    super(sql, tableNames.USER_ACCESS, selectableProps);
  }

  // Get all users and their access for this experiment
  async getExperimentUsers(experimentId) {
    const experimentUsers = await this.find({ experiment_id: experimentId });

    if (_.isEmpty(experimentUsers)) {
      throw new NotFoundError('Experiment not found');
    }

    return experimentUsers;
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
    const result = await this.sql(tableNames.USER_ACCESS)
      .first()
      .where({ experiment_id: experimentId, user_id: userId })
      .from(tableNames.USER_ACCESS);

    // If there is no entry for this user and role, then user definitely doesn't have access
    if (_.isNil(result)) {
      return false;
    }

    const { accessRole: role } = result;

    return isRoleAuthorized(role, url, method);
  }
}

module.exports = UserAccess;
