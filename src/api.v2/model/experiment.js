const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');

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

const basicModelFunctions = generateBasicModelFunctions({
  tableName,
  selectableProps,
});

module.exports = {
  ...basicModelFunctions,
};
