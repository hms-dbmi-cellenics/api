const ExperimentService = require('../../api/route-services/experiment');

const experimentService = new ExperimentService();

const saveProcessingConfigFromGem2s = async (payload) => {
  const { experimentId, item } = payload;

  if (!item) return;

  await experimentService.updateExperiment(experimentId, item);
};

module.exports = saveProcessingConfigFromGem2s;
