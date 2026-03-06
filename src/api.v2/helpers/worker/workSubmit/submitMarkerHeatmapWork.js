const submitWorkForHook = require('./submitWorkForHook');

const submitMarkerHeatmapWork = async (message) => {
  const { experimentId, input: { authJWT } } = message;

  const body = {
    name: 'MarkerHeatmap',
    nGenes: 5,
    selectedCellSet: 'louvain',
  };

  const ETag = await submitWorkForHook(experimentId, authJWT, body);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitMarkerHeatmapWork;
