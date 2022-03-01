const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async () => {
  const params = await getConnectionParams();
  return {
    [config.clusterEnv]: {
      client: 'postgresql',
      connection: params,
    },
  };
};

module.exports = async () => {
  const configuration = await fetchConfiguration();
  return {
    ...configuration,
  };
};
