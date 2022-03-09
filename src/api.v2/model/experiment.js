const createGuts = require('../helpers/modelGuts');

const tableName = 'experiment';

const selectableProps = [
  'id',
  'name',
  'description',
  'processing_config',
  'notify_by_email',
  'created_at',
  'updated_at',
];

const guts = createGuts({
  tableName,
  selectableProps,
});

module.exports = {
  ...guts,
};
