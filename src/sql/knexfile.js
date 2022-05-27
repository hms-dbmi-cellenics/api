const _ = require('lodash');

const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

// This was necessary because all of processingConfig is camelcase except for
// absolute_theshold, which breaks the camelcase we had assumed
// Consider migrating the property absolute_threshold to absoluteThreshold instead of doing this
const processingConfigExceptions = ['methodSettings'];

const recursiveCamelcase = (result, camelCaseExceptions = [], skip = false) => (
  _.transform(result, (acc, value, key, target) => {
    let camelKey;

    if (_.isArray(target) || skip || !key.includes('_')) {
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
      recursiveCamelcase(
        result,
        [queryContext.camelCaseExceptions, ...processingConfigExceptions],
      )),
  },
});

module.exports = async () => {
  const configuration = await fetchConfiguration(config.clusterEnv, config.rdsSandboxId);
  return {
    ...configuration,
  };
};
