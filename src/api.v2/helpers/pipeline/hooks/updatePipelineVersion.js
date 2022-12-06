const Experiment = require('../../../model/Experiment');

const updatePipelineVersion = async (message) => {
  const { experimentId, pipelineVersion } = message;

  await new Experiment().updateById(experimentId, { pipeline_version: pipelineVersion });
};

module.exports = updatePipelineVersion;
