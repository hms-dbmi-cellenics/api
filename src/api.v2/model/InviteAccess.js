const BasicModel = require('../helpers/BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableName = 'invite_access';

const selectableProps = [
  'user_email',
  'experiment_id',
  'access_role',
  'updated_at',
];

class InviteAccess extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableName, selectableProps);
  }
}

module.exports = InviteAccess;
