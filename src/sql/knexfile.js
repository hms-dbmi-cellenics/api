const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async (environment, sandboxId) => {
  const params = await getConnectionParams(environment, sandboxId);
  return {
    [environment]: {
      client: 'postgresql',
      connection: params,
    },
  };
};

module.exports = async () => {
  const configuration = await fetchConfiguration(config.clusterEnv, config.sandboxId);
  return {
    ...configuration,
  };
};
