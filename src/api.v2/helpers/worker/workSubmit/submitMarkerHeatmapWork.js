const submitWork = require('./submitWork');
const workerVersions = require('../workerVersions');

const MarkerHeatmap = 'MarkerHeatmap';

const getClusteringSettings = (message) => message.input.config.clusteringSettings;
const getSelectedCellSet = (message) => [message.input.config.clusteringSettings.method];

const dependencyGetters = [getClusteringSettings, getSelectedCellSet];

const getMarkerHeatmapDependencies = (message) => {
  const dependencies = dependencyGetters.map(
    (dependencyGetter) => dependencyGetter(message),
  );

  if (workerVersions[MarkerHeatmap]) {
    dependencies.push(workerVersions[MarkerHeatmap]);
  }

  return dependencies;
};

const submitMarkerHeatmapWork = async (message) => {
  const { experimentId, input: { authJWT } } = message;

  const numGenes = 5;
  const selectedCellSet = 'louvain';

  const body = {
    name: MarkerHeatmap,
    nGenes: numGenes,
    cellSetKey: selectedCellSet,
    groupByClasses: ['louvain', 'sample'],
    selectedPoints: 'All',
    hiddenCellSetKeys: [],
  };

  const extraDependencies = getMarkerHeatmapDependencies(message);

  const ETag = await submitWork(experimentId, authJWT, body, extraDependencies);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitMarkerHeatmapWork;
