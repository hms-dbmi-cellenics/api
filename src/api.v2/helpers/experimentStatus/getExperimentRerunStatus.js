const _ = require('lodash');

const ExperimentExecution = require('../../model/ExperimentExecution');
const getGem2sParams = require('./getGem2sParams');

const getExperimentRerunStatus = async (experimentId) => {
  const execution = await new ExperimentExecution().findOne({ experiment_id: experimentId, pipeline_type: 'gem2s' });

  if (execution === undefined) {
    return {
      rerun: true,
    };
  }

  const currentParams = await getGem2sParams(experimentId);

  return {
    rerun: !_.isEqual(currentParams, execution.lastGem2SParams),
  };
};

module.exports = getExperimentRerunStatus;
