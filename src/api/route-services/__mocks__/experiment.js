const mockExperimentData = jest.fn((experimentId) => new Promise((resolve) => {
  resolve({
    experimentId,
    experimentName: 'my mocky name',
  });
}));

const mockDeleteExperiment = jest.fn(() => new Promise((resolve) => {
  resolve([]);
}));

const mockGetListOfExperiments = jest.fn((experimentIds) => new Promise((resolve) => {
  resolve(experimentIds.map((experimentId) => ({
    experimentId,
  })));
}));

const mockGetCellSets = jest.fn(() => new Promise((resolve) => {
  resolve({
    cellSets: [
      {
        color: 'white',
        name: 'Cell types',
        key: 'a',
        children: [
          {
            color: 'blue',
            key: 'b',
            name: 'some cells',
          },
          {
            color: 'red',
            key: 'c',
            name: 'some other cells',
          },
        ],
      },
      {
        color: 'black',
        name: 'amazing cells',
        key: 'd',
      },
    ],
  });
}));

const mockUpdateCellSets = jest.fn((experimentId, cellSetData) => new Promise((resolve) => {
  resolve(cellSetData);
}));

const mockGetProcessingConfig = jest.fn(() => new Promise((resolve) => {
  resolve({
    classifier: {
      filterSettings: {
        minProbability: 0.5,
        bandwidth: -1,
      },
    },
  });
}));

const mockUpdateProcessingConfig = jest.fn(
  () => new Promise((resolve) => {
    resolve({
      processingConfig: {
        cellSizeDistribution: {
          filterSettings: { minCellSize: 10800, binStep: 200 },
          enabled: true,
        },
        readAlignment: { filterSettings: { method: 'absolute_threshold', methodSettings: { absolute_threshold: { bandwidth: -1, filterThreshold: 0.5 } } }, enabled: true },
        classifier: { filterSettings: { minProbabiliy: 0.8, filterThreshold: -1 }, enabled: true },
        mitochondrialContent: { filterSettings: { method: 'absolute_threshold', methodSettings: { absolute_threshold: { maxFraction: 0.1, binStep: 0.05 } } }, enabled: true },
        configureEmbedding: { embeddingSettings: { method: 'tsne', methodSettings: { tsne: { perplexity: 30, learningRate: 200 }, umap: { minimumDistance: 0.1, distanceMetric: 'euclidean' } } }, clusteringSettings: { method: 'louvain', methodSettings: { louvain: { resolution: 0.5 } } } },
        numGenesVsNumUmis: {
          filterSettings: {
            regressionType: 'gam', smoothing: 13, stringency: 2.1, lowerCutoff: 2.1, binStep: 0.05, upperCutoff: 4.8,
          },
          enabled: true,
        },
        dataIntegration: {
          dataIntegration: {
            method: 'seuratv4',
            methodSettings: {
              seuratv4: {
                numGenes: 2000,
                normalisation: 'logNormalize',
              },
              fastmnn: {
                numGenes: 2000,
                normalisation: 'logNormalize',
              },
              unisample: {
                numGenes: 2000,
                normalisation: 'logNormalize',
              },
            },
          },
          dimensionalityReduction: {
            method: 'rpca',
            numPCs: 30,
            excludeGeneCategories: ['ribosomal', 'mitochondrial', 'cellCycle'],
          },
        },
        doubletScores: {
          filterSettings: { probabilityThreshold: 0.2, binStep: 0.05 },
          enabled: true,
        },
      },
    });
  }),
);

const mock = jest.fn().mockImplementation(() => ({
  getExperimentData: mockExperimentData,
  deleteExperiment: mockDeleteExperiment,
  getListOfExperiments: mockGetListOfExperiments,
  getCellSets: mockGetCellSets,
  updateCellSets: mockUpdateCellSets,
  getProcessingConfig: mockGetProcessingConfig,
  updateProcessingConfig: mockUpdateProcessingConfig,
  experimentsTableName: 'experiments-test',
}));

module.exports = mock;
