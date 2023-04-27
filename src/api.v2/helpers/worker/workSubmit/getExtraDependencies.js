const workerVersions = require('../workerVersions');

const getClusteringSettings = async (message) => {
  console.log('processingConfig: ', message);
  const { input: { config: { clusteringSettings } } } = message;


  return clusteringSettings;
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
  MarkerHeatmap: [getClusteringSettings],
  GetTrajectoryAnalysisStartingNodes: [getClusteringSettings],
  GetTrajectoryAnalysisPseudoTime: [getClusteringSettings],
  GetNormalizedExpression: [getClusteringSettings],
  DownloadAnnotSeuratObject: [getClusteringSettings],
};

// message is assumed to be the configureEmbedding payload received
// from the pipeline containing clutering & embedding settings
const getExtraDependencies = async (name, message) => {
  const dependencies = await Promise.all(
    dependencyGetters[name].map(
      (dependencyGetter) => dependencyGetter(message),
    ),
  );

  if (workerVersions[name]) {
    dependencies.push(workerVersions[name]);
  }

  return dependencies;
};

module.exports = getExtraDependencies;
