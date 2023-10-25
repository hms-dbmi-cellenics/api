const workerVersions = require('../workerVersions');
const Experiment = require('../../../model/Experiment');
const getS3Object = require('../../s3/getObject');
const bucketNames = require('../../../../config/bucketNames');


const getClusteringSettings = async (experimentId) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

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
  MarkerHeatmap: [getClusteringSettings],
  GetTrajectoryAnalysisStartingNodes: [getClusteringSettings],
  GetTrajectoryAnalysisPseudoTime: [getClusteringSettings],
  GetNormalizedExpression: [getClusteringSettings],
  DownloadAnnotSeuratObject: [getClusteringSettings, getCellSets],
};

const getExtraDependencies = async (experimentId, taskName) => {
  console.log('getExtraDependencies', taskName);
  const dependencies = await Promise.all(
    dependencyGetters[taskName].map(
      (dependencyGetter) => dependencyGetter(experimentId),
    ),
  );

  console.log('dependencies', dependencies);

  if (workerVersions[taskName]) {
    dependencies.push(workerVersions[taskName]);
  }

  return dependencies;
};

module.exports = getExtraDependencies;
