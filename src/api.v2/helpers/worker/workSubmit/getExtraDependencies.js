const workerVersions = require('../workerVersions');
const Experiment = require('../../../model/Experiment');
const getS3Object = require('../../s3/getObject');
const bucketNames = require('../../../../config/bucketNames');


const getClusteringSettings = async (experimentId, body) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

  console.log('processingConfig', processingConfig);
  console.log('body', body);

  const { configureEmbedding: { clusteringSettings } } = processingConfig;

  console.log('clusteringSettings', clusteringSettings);
  return clusteringSettings;
};

const getCellSets = async (experimentId) => {
  // consider just fetching latest modified date instead of the whole object
  const cellSets = await getS3Object({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  });
  return cellSets;
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
  DownloadAnnotSeuratObject: [getClusteringSettings, getCellSets],
};

const getExtraDependencies = async (experimentId, taskName, body) => {
  console.log('getExtraDependencies', taskName, body);
  const dependencies = await Promise.all(
    dependencyGetters[taskName].map(
      (dependencyGetter) => dependencyGetter(experimentId, body),
    ),
  );

  console.log('dependencies', dependencies);

  if (workerVersions[taskName]) {
    dependencies.push(workerVersions[taskName]);
  }

  return dependencies;
};

module.exports = getExtraDependencies;
