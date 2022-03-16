const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async (environment, username) => {
  const params = await getConnectionParams(environment, username);
  return {
    [environment]: {
      client: 'postgresql',
      connection: params,
    },
  };
};

module.exports = async () => {
  // Check if this is being run for a migration or for the api
  const environment = process.env.MIGRATIONS_ENV || config.clusterEnv;
  const username = process.env.MIGRATIONS_ENV ? 'dev_role' : 'api_role';

  const configuration = await fetchConfiguration(environment, username);
  return {
    ...configuration,
  };
};
