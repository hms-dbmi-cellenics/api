const createGuts = require('../helpers/modelGuts');

const tableName = 'user_access';

const selectableProps = [
  'user_id',
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
