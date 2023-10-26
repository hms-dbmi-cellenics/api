const workerVersions = require('../workerVersions');
const Experiment = require('../../../model/Experiment');
const getS3Object = require('../../s3/getObject');
const bucketNames = require('../../../../config/bucketNames');


const getClusteringSettings = async (experimentId) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

  const { configureEmbedding: { clusteringSettings } } = processingConfig;

  // TODO DISCUSS Option 1,  return only the settings currently in use (more brittle as it
  // depends on keys existings etc...)
  // const { method, methodSettings } = clusteringSettings;
  // console.log('clusteringSettings', clusteringSettings);
  // return { method, methodSettings: methodSettings[method] };

  // Option 2,return the whole object (it will invalidate cache if methods not used change)
  console.log('clusteringSettings', clusteringSettings);
  return clusteringSettings;
};

const getEmbeddingSettings = async (experimentId) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

  const { configureEmbedding: { embeddingSettings } } = processingConfig;

  // TODO Option 1,  return only the settings currently in use (more brittle as it
  // depends on keys existings etc...)
  // const { method, methodSettings } = embeddingSettings;
  // console.log('embeddingSettings', embeddingSettings);
  // return { method, methodSettings: methodSettings[method] };

  // Option 2,return the whole object (it will invalidate cache if methods not used change)
  console.log('embeddingSettings', embeddingSettings);
  return embeddingSettings;
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
