const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');

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

const canAccessExperiment = async (userId, experimentId) => {
  const results = await sqlClient.get()
    .select()
    .from(tableName)
    .where({ experiment_id: experimentId, user_id: userId });

  // If there is an entry in userAccess, then the user has access to the experiment
  return results.length > 0;
};

module.exports = {
  canAccessExperiment,
  ...basicModelFunctions,
};
