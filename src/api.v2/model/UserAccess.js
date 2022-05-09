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

  async addToInviteAccess(userId, experimentId, role) {
    return await this.sql
      .insert({ user_id: userId, experiment_id: experimentId, access_role: role })
      .into(tableNames.INVITE_ACCESS);
  }

  async registerNewUserAccess(userEmail, userId) {
    // Create new user access
    const records = await this.sql
      .select(['experiment_id', 'access_role'])
      .from(tableNames.INVITE_ACCESS)
      .where({ user_email: userEmail });

    const insertPromise = records.forEach((record) => {
      this.create({
        user_id: userId,
        experiment_id: record.experiment_id,
        access_role: record.access_role,
      });
    });

    await Promise.all(insertPromise);
  }

  async grantAccess(userId, experimentId, role) {
    return await this.create(
      { user_id: userId, experiment_id: experimentId, access_role: role },
    );
  }

  async removeAccess(userId, experimentId) {
    return await this.delete({ experiment_id: experimentId, user_id: userId });
  }

  async createNewExperimentPermissions(userId, experimentId) {
    logger.log('Setting up access permissions for experiment');

    // Create admin permissions
    await this.grantAccess(config.adminSub, experimentId, AccessRole.ADMIN);

    if (userId === config.adminSub) {
      logger.log('User is the admin, so only creating admin access');
      return;
    }

    await this.grantAccess(userId, experimentId, AccessRole.OWNER);
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
