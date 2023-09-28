const submitWork = require('./submitWork');
const workerVersions = require('../workerVersions');

const MarkerHeatmap = 'MarkerHeatmap';

const getClusteringSettings = (message) => {
  const { input: { config: { clusteringSettings } } } = message;
  return clusteringSettings;
};

const getSelectedCellSet = (message) => {
  const { input: { config: { clusteringSettings: { method } } } } = message;
  return [method];
};

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
    groupByClasses: ['louvain'],
    selectedPoints: 'All',
    hiddenCellSetKeys: [],
  };

  console.log('MARKERHEATMAP WORK MESSAGE: ', JSON.stringify(message));

  const extraDependencies = getMarkerHeatmapDependencies(message);
  const ETag = await submitWork(experimentId, authJWT, body, extraDependencies);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitMarkerHeatmapWork;
