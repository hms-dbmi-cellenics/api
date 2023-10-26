const workerVersions = require('../workerVersions');
const Experiment = require('../../../model/Experiment');
const getLastModified = require('../../s3/getLastModified');
const bucketNames = require('../../../../config/bucketNames');


const getClusteringSettings = async (experimentId) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

  const {
    configureEmbedding: { clusteringSettings: { method, methodSettings } },
  } = processingConfig;

  return { method, methodSettings: methodSettings[method] };
};

const getEmbeddingSettings = async (experimentId) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

  const {
    configureEmbedding: {
      embeddingSettings: { method, methodSettings },
    },
  } = processingConfig;

  return { method, methodSettings: methodSettings[method] };
};

const getCellSets = async (experimentId) => {
  // TODO consider just fetching latest modified date instead of the whole object
  const lastModified = await getLastModified({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  });

  const lastVersion = `${bucketNames.CELL_SETS}/${experimentId}/${lastModified}`;
  console.log('lastVersion', lastVersion);
  return lastVersion;
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
  GetTrajectoryAnalysisPseudoTime: [getClusteringSettings, getEmbeddingSettings],
  GetNormalizedExpression: [getClusteringSettings],
  DownloadAnnotSeuratObject: [getClusteringSettings, getCellSets, getEmbeddingSettings],
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
