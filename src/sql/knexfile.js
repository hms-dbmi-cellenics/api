const _ = require('lodash');

const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

const recursiveCamelcase = (result, camelCaseExceptions = [], skip = false) => (
  _.transform(result, (acc, value, key, target) => {
    let camelKey;

    if (_.isArray(target) || skip) {
      camelKey = key;
    } else {
      camelKey = _.camelCase(key);
    }

    const skipNext = camelCaseExceptions.includes(key);

    acc[camelKey] = _.isObject(value)
      ? recursiveCamelcase(value, camelCaseExceptions, skipNext)
      : value;
  })
);

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async (environment, rdsSandboxId) => ({
  [environment]: {
    client: 'postgresql',
    connection: async () => await getConnectionParams(environment, rdsSandboxId),
    postProcessResponse: (result, queryContext = {}) => (
      recursiveCamelcase(result, queryContext.camelCaseExceptions)),
  },
});

module.exports = async () => {
  const configuration = await fetchConfiguration(config.clusterEnv, config.rdsSandboxId);
  return {
    ...configuration,
  };
};
