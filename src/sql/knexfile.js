const _ = require('lodash');

const config = require('../config');
const getConnectionParams = require('./getConnectionParams');

const removeDashesFromExperimentId = (result) => (
  _.transform(result, (acc, value, key) => {
    let newValue = value;

    if (key === 'experiment_id') {
      newValue = value.replace(/-/gi, '');
    }

    acc[key] = _.isObject(value)
      ? removeDashesFromExperimentId(value)
      : newValue;
  })
);

const removeDashesFromExperimentIdStep = ({ result, queryContext }) => {
  const newResult = removeDashesFromExperimentId(result);
  return { result: newResult, queryContext };
};

const recursiveCamelcase = (result, queryContext, skip) => {
  const { camelCaseExceptions = [] } = queryContext;

  return _.transform(result, (acc, value, key, target) => {
    let camelKey;

    // The filter of underscore is necessary because we don't want to camelcase sample ids
    if (_.isArray(target) || skip || !key.includes('_')) {
      camelKey = key;
    } else {
      camelKey = _.camelCase(key);
    }

    const skipNext = camelCaseExceptions.includes(key);

    acc[camelKey] = _.isObject(value)
      ? recursiveCamelcase(value, queryContext, skipNext)
      : value;
  });
};

const recursiveCamelcaseStep = (a) => {
  const { result, queryContext } = a;
  const newResult = recursiveCamelcase(result, queryContext, false);

  return { result: newResult, queryContext };
};

// This is one of the shapes the knexfile can take https://knexjs.org/#knexfile
const fetchConfiguration = async (environment, rdsSandboxId) => ({
  [environment]: {
    client: 'postgresql',
    connection: async () => await getConnectionParams(environment, rdsSandboxId),
    postProcessResponse: (result, queryContext = {}) => {
      const postProcessResponsePipeline = _.flow([
        removeDashesFromExperimentIdStep,
        recursiveCamelcaseStep,
      ]);

      const { result: processedResponse } = postProcessResponsePipeline({ result, queryContext });

      return processedResponse;
    },
  },
});

module.exports = async () => {
  const configuration = await fetchConfiguration(config.clusterEnv, config.rdsSandboxId);
  return {
    ...configuration,
  };
};
