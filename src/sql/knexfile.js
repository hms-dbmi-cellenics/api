const _ = require('lodash');

const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async (environment, isAMigration) => {
  const params = await getConnectionParams(environment, isAMigration);
  return {
    [environment]: {
      client: 'postgresql',
      connection: params,
    },
  };
};

module.exports = async () => {
  // Check if this is being run for a migration or for the api
  const isAMigration = !_.isNil(process.env.MIGRATIONS_ENV);
  const environment = process.env.MIGRATIONS_ENV || config.clusterEnv;

  const configuration = await fetchConfiguration(environment, isAMigration);
  return {
    ...configuration,
  };
};
