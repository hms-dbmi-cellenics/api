const { createExperimentToSubset, executeSubsetPipeline } = require('../helpers/pipeline/subset');

const handleSubsetRequest = async (req, res) => {
  const {
    params: { experimentId },
    body: { name, cellSetKeys },
    user: { sub: userId },
  } = req;

  const subsetExperimentId = await createExperimentToSubset(experimentId, userId, name);

  const params = {
    experimentId,
    name,
    cellSetKeys,
    userId,
    subsetExperimentId,
  };

  await executeSubsetPipeline(params, req.headers.authorization);
  res.json(subsetExperimentId);
};

module.exports = {
  handleSubsetRequest,
};
