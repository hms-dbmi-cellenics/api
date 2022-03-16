const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');

const tableName = 'invite_access';

const selectableProps = [
  'user_email',
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
