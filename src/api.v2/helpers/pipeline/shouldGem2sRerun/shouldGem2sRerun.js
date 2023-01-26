const _ = require('lodash');

const ExperimentExecution = require('../../../model/ExperimentExecution');
const getGem2sParams = require('./getGem2sParams');

const shouldGem2sRerun = async (experimentId) => {
  const execution = await new ExperimentExecution().findOne({ experiment_id: experimentId, pipeline_type: 'gem2s' });
  if (execution === undefined) return true;

  const currentParams = await getGem2sParams(experimentId);

  return !_.isEqual(currentParams, execution.lastGem2SParams);
};

module.exports = { shouldGem2sRerun };
