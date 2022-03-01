const ExperimentService = require('../../api/services/experiments/ExperimentService');

const experimentService = new ExperimentService();

const saveProcessingConfigFromGem2s = async (payload) => {
  const { experimentId, item } = payload;

  if (!item) return;

  await experimentService.updateExperiment(experimentId, item);
};

module.exports = saveProcessingConfigFromGem2s;
