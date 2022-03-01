const ExperimentService = require('../../api/services/experiments/ExperimentService');

const { createQCPipeline } = require('../../api/services/pipelines/manage');

const experimentService = new ExperimentService();

const runQCPipeline = async (payload) => {
  const { experimentId } = payload;
  // we need to change this once we rework the pipeline message response
  const authJWT = payload.authJWT || payload.input.authJWT;
  const qcHandle = await createQCPipeline(experimentId, [], authJWT);
  await experimentService.saveQCHandle(experimentId, qcHandle);
};

module.exports = runQCPipeline;
