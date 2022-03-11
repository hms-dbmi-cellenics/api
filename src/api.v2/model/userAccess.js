const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');

const tableName = 'user_access';

const selectableProps = [
  'user_id',
  'experiment_id',
  'access_role',
  'updated_at',
];

const basicModelFunctions = generateBasicModelFunctions({
  tableName,
  selectableProps,
});

module.exports = {
  ...basicModelFunctions,
};
