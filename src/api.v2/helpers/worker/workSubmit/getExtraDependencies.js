const workerVersions = require('../workerVersions');
const Experiment = require('../../../model/Experiment');

const getClusteringSettings = async (experimentId, body) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

  console.log('processingConfig', processingConfig);
  console.log('body', body);

  // const { input: { config: { clusteringSettings } } } = message;

  return { };
};

const dependencyGetters = {
  ClusterCells: [],
  ScTypeAnnotate: [],
  GetExpressionCellSets: [],
  GetEmbedding: [],
  ListGenes: [],
  DifferentialExpression: [getClusteringSettings],
  BatchDifferentialExpression: [getClusteringSettings],
  GeneExpression: [],
  GetBackgroundExpressedGenes: [getClusteringSettings],
  DotPlot: [getClusteringSettings],
  GetDoubletScore: [],
  GetMitochondrialContent: [],
  GetNGenes: [],
  GetNUmis: [],
  MarkerHeatmap: [getClusteringSettings], // TODO getSelectedCellSet needs to be
  // replaced by adding the actuall cells in the work request instead of only the cellset key
  // MarkerHeatmap: [getClusteringSettings, getSelectedCellSet],
  GetTrajectoryAnalysisStartingNodes: [getClusteringSettings],
  GetTrajectoryAnalysisPseudoTime: [getClusteringSettings],
  GetNormalizedExpression: [getClusteringSettings],
  DownloadAnnotSeuratObject: [getClusteringSettings],
  // DownloadAnnotSeuratObject: [getClusteringSettings, getCellSets], // todo getCellSets needs to be replaced
};

const getExtraDependencies = async (experimentId, taskName, body) => {
  console.log('getExtraDependencies', taskName, body);
  const dependencies = await Promise.all(
    dependencyGetters[taskName].map(
      (dependencyGetter) => dependencyGetter(experimentId, body),
    ),
  );

  if (workerVersions[taskName]) {
    dependencies.push(workerVersions[taskName]);
  }

  return dependencies;
};

module.exports = getExtraDependencies;
