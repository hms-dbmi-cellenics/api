// import workerVersions from 'utils/work/workerVersions';

const workerVersions = require('../workerVersions');

const Experiment = require('../../../model/Experiment');

const getClusteringSettings = async (experimentId) => {
  const processingConfig = await new Experiment().getProcessingConfig(experimentId);

  console.log('processingConfig: ', processingConfig);
  const { clusteringSettings } = processingConfig.configureEmbedding;


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
};

const getExtraDependencies = async (experimentId, name, dispatch, getState) => {
  const dependencies = await Promise.all(
    dependencyGetters[name].map(
      (dependencyGetter) => dependencyGetter(experimentId, dispatch, getState),
    ),
  );

  if (workerVersions[name]) {
    dependencies.push(workerVersions[name]);
  }

  return dependencies;
};

module.exports = getExtraDependencies;
