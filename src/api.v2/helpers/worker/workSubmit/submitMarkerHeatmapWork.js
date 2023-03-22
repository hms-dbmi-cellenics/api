const getExtraDependencies = require('./getExtraDependencies');
const submitWork = require('./submitWork');


const submitMarkerHeatmapWork = async (message) => {
  const { experimentId, input: { authJWT } } = message;

  const numGenes = 5;
  const selectedCellSet = 'louvain';

  const body = {
    name: 'MarkerHeatmap',
    nGenes: numGenes,
    cellSetKey: selectedCellSet,
    groupByClasses: ['louvain'],
    selectedPoints: 'All',
    hiddenCellSetKeys: [],
  };

  const extraDependencies = await getExtraDependencies(body.name, message);
  const ETag = await submitWork(experimentId, authJWT, body, extraDependencies);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitMarkerHeatmapWork;
