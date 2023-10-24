const workerVersions = require('../workerVersions');

const getClusteringSettings = async (message) => {
  const { input: { config: { clusteringSettings } } } = message;

  return clusteringSettings;
};

const getCellSetsThatAffectDownsampling = async (message, body, cellSets) => {
  const { selectedCellSet, groupedTracks } = body.downsampleSettings;

  const selectedCellSetKeys = cellSets
    .find(({ key }) => key === selectedCellSet)
    .children.map(({ key }) => key);

  const groupedCellSetKeys = cellSets
    .filter(({ key }) => groupedTracks.includes(key))
    .flatMap(({ children }) => children)
    .map(({ key }) => key);

  // Keep them in separate lists, they each represent different changes in the settings
  return [selectedCellSetKeys, groupedCellSetKeys];
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
    getClusteringSettings, getCellSetsThatAffectDownsampling,
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
