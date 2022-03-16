const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async (environment) => {
  const params = await getConnectionParams(environment);
  return {
    [environment]: {
      client: 'postgresql',
      connection: params,
    },
  };
};

module.exports = async () => {
  const environment = process.env.MIGRATIONS_ENV || config.clusterEnv;

  const configuration = await fetchConfiguration(environment);
  return {
    ...configuration,
  };
};
