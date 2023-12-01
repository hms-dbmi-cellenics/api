const workerVersions = require('../workerVersions');
const Experiment = require('../../../model/Experiment');
const getLastModified = require('../../s3/getLastModified');
const bucketNames = require('../../../../config/bucketNames');
const getS3Object = require('../../s3/getObject');
const getCellSetsAffectingDownsampling = require('./getCellSetsAffectingDownsampling');

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

const getCellSetsLastVersion = async (experimentId) => {
  const lastModified = await getLastModified({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  });

  const lastVersion = `${bucketNames.CELL_SETS}/${experimentId}/${lastModified}`;
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
  MarkerHeatmap: [
    getClusteringSettings, getCellSetsAffectingDownsampling,
  ],
  GetTrajectoryAnalysisStartingNodes: [getClusteringSettings],
  GetTrajectoryAnalysisPseudoTime: [getClusteringSettings, getEmbeddingSettings],
  GetNormalizedExpression: [getClusteringSettings],
  DownloadAnnotSeuratObject: [getClusteringSettings, getCellSetsLastVersion, getEmbeddingSettings],
};

const getExtraDependencies = async (experimentId, taskName, body) => {
  const { cellSets } = JSON.parse(await getS3Object({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  }));


  const dependencies = await Promise.all(
    dependencyGetters[taskName].map(
      (dependencyGetter) => dependencyGetter(experimentId, body, cellSets),
    ),
  );

  if (workerVersions[taskName]) {
    dependencies.push(workerVersions[taskName]);
  }

  return dependencies;
};

module.exports = getExtraDependencies;
