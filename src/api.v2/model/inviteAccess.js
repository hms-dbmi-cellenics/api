const createGuts = require('../helpers/modelGuts');

const tableName = 'invite_access';

const selectableProps = [
  'user_email',
  'experiment_id',
  'access_role',
  'updated_at',
];

const guts = createGuts({
  tableName,
  selectableProps,
});

module.exports = {
  ...guts,
};
