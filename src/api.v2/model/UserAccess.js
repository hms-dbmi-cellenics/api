const _ = require('lodash');

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
const constants = require('../../utils/constants');
const getAdminSub = require('../../utils/getAdminSub');

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

  async addToInviteAccess(userEmail, experimentId, role) {
    return await this.sql
      .insert({ user_email: userEmail, experiment_id: experimentId, access_role: role })
      .into(tableNames.INVITE_ACCESS);
  }

  async registerNewUserAccess(userEmail, userId) {
    logger.log(`Registering access for user ${userEmail}`);

    const records = await this.sql
      .select(['experiment_id', 'access_role'])
      .from(tableNames.INVITE_ACCESS)
      .where({ user_email: userEmail });

    const createUserPromise = records.map((record) => this.create({
      user_id: userId,
      experiment_id: record.experimentId,
      access_role: record.accessRole,
    }));

    await Promise.all(createUserPromise);

    logger.log(`Access successfully added for user ${userEmail}`);

    await this.sql.del().from(tableNames.INVITE_ACCESS).where({ user_email: userEmail });

    logger.log(`Invitation record deleted for user ${userEmail}`);
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

    await this.grantAccess(userId, experimentId, AccessRole.OWNER);

    const adminSub = await getAdminSub();
    if (userId !== adminSub) await this.grantAccess(adminSub, experimentId, AccessRole.ADMIN);
  }


  async canAccessExperiment(userId, experimentId, url, method) {
    const result = await this.sql(tableNames.USER_ACCESS)
      // Check if user has access
      .where({ experiment_id: experimentId, user_id: userId })
      // Or if it is a public access experiment
      .orWhere({ experiment_id: experimentId, user_id: constants.PUBLIC_ACCESS_ID })
      .from(tableNames.USER_ACCESS);

    const roles = _.map(result, 'accessRole');

    // Check if any of user's roles for this exp are authorized
    return roles.some((role) => isRoleAuthorized(role, url, method));
  }
}

module.exports = UserAccess;
