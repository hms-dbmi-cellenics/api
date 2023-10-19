const workerVersions = require('../workerVersions');

const getClusteringSettings = async (message) => {
  const { input: { config: { clusteringSettings } } } = message;

  return clusteringSettings;
};

const getSelectedCellSet = async (message, body, cellSets) => {
  const { selectedCellSet } = body.downsampleSettings;

  const cellSetsKeys = cellSets
    .find(({ key }) => key === selectedCellSet)
    .children.map(({ key }) => key);

  return cellSetsKeys;
};

const getGroupedTracksCellSets = async (message, body, cellSets) => {
  const { groupedTracks } = body.downsampleSettings;

  const cellSetsKeys = cellSets
    .filter(({ key }) => groupedTracks.includes(key))
    .flatMap(({ children }) => children)
    .map(({ key }) => key);

  return cellSetsKeys;
};

const dependencyGetters = {
  ClusterCells: [],
  GetExpressionCellSets: [],
  GetEmbedding: [],
  ListGenes: [],
  DifferentialExpression: [getClusteringSettings],
  GeneExpression: [],
  GetBackgroundExpressedGenes: [getClusteringSettings],
  DotPlot: [getClusteringSettings],
  GetDoubletScore: [],
  GetMitochondrialContent: [],
  GetNGenes: [],
  GetNUmis: [],
  MarkerHeatmap: [
    getClusteringSettings, getSelectedCellSet, getGroupedTracksCellSets,
  ],
  GetTrajectoryAnalysisStartingNodes: [getClusteringSettings],
  GetTrajectoryAnalysisPseudoTime: [getClusteringSettings],
  GetNormalizedExpression: [getClusteringSettings],
  DownloadAnnotSeuratObject: [getClusteringSettings],
};

// message is assumed to be the configureEmbedding payload received
// from the pipeline containing clutering & embedding settings
const getExtraDependencies = async (name, message, body, cellSets = undefined) => {
  const dependencies = await Promise.all(
    dependencyGetters[name].map(
      (dependencyGetter) => dependencyGetter(message, body, cellSets),
    ),
  );

  if (workerVersions[name]) {
    dependencies.push(workerVersions[name]);
  }

  return dependencies;
};

module.exports = getExtraDependencies;
