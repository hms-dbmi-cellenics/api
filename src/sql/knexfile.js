const _ = require('lodash');

const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

const exceptions = new Set(['gem2s']);

const recursiveCamelcase = (result) => _.transform(result, (acc, value, key, target) => {
  let camelKey;

  if (_.isArray(target) || exceptions.has(key)) {
    camelKey = key;
  } else {
    camelKey = _.camelCase(key);
  }

  acc[camelKey] = _.isObject(value) ? recursiveCamelcase(value) : value;
});

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async (environment, sandboxId) => {
  const params = await getConnectionParams(environment, sandboxId);
  return {
    [environment]: {
      client: 'postgresql',
      connection: params,
      migrations: {
        tableName: 'migrations',
      },
      postProcessResponse: recursiveCamelcase,
    },
  };
};

module.exports = async () => {
  const configuration = await fetchConfiguration(config.clusterEnv, config.sandboxId);
  return {
    ...configuration,
  };
};
