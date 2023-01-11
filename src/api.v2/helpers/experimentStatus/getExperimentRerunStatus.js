const ExperimentExecution = require('../../model/ExperimentExecution');
const hashExperiment = require('./hashExperiment');

const getExperimentRerunStatus = async (experimentId) => {
  const execution = await new ExperimentExecution().findOne({ experiment_id: experimentId, pipeline_type: 'gem2s' });

  if (execution === undefined) {
    return {
      rerun: true,
    };
  }

  const currentHash = hashExperiment(experimentId);

  return {
    rerun: currentHash !== execution.params_hash,
  };
};

module.exports = getExperimentRerunStatus;
