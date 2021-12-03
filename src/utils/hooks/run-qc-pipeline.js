const ExperimentService = require('../../api/route-services/experiment');

const { createQCPipeline } = require('../../api/general-services/pipeline-manage');

const experimentService = new ExperimentService();

const runQCPipeline = async (payload) => {
  const { experimentId } = payload;
  // we need to change this once we rework the pipeline message response
  const authJWT = payload.authJWT || payload.input.authJWT;
  const qcHandle = await createQCPipeline(experimentId, [], authJWT);
  await experimentService.saveQCHandle(experimentId, qcHandle);
};

module.exports = runQCPipeline;
