const ExperimentService = require('../../api/route-services/experiment');

const { createQCPipeline } = require('../../api/general-services/pipeline-manage');

const experimentService = new ExperimentService();

const runQCPipeline = async (payload) => {
  const { experimentId, authJWT } = payload;

  const qcHandle = await createQCPipeline(experimentId, [], authJWT);
  await experimentService.saveQCHandle(experimentId, qcHandle);
};

module.exports = runQCPipeline;
