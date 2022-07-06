const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const selectableProps = [
  'user_email',
  'experiment_id',
  'access_role',
  'updated_at',
];

class InviteAccess extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.INVITE_ACCESS, selectableProps);
  }
}

module.exports = InviteAccess;
