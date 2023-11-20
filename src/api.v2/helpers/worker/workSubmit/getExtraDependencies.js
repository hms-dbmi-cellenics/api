const workerVersions = require('../workerVersions');
const Experiment = require('../../../model/Experiment');
const getLastModified = require('../../s3/getLastModified');
const bucketNames = require('../../../../config/bucketNames');
const getS3Object = require('../../s3/getObject');

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
  return lastVersion;
};


const getCellSetsThatAffectDownsampling = async (_experimentId, body, cellSets) => {
  // If not downsampling, then there's no dependency set by this getter
  if (!body.downsampleSettings) return '';

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
    getClusteringSettings, getCellSetsThatAffectDownsampling,
  ],
  GetTrajectoryAnalysisStartingNodes: [getClusteringSettings],
  GetTrajectoryAnalysisPseudoTime: [getClusteringSettings, getEmbeddingSettings],
  GetNormalizedExpression: [getClusteringSettings],
  DownloadAnnotSeuratObject: [getClusteringSettings, getCellSets, getEmbeddingSettings],
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
