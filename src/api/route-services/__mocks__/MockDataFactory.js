class MockDataFactory {
  constructor({ experimentId = 'experimentId', projectId = 'projectId', sampleId = 'sampleId' }) {
    this.experimentId = experimentId;
    this.projectId = projectId;
    this.sampleIds = [sampleId];

    this.processingConfig = {
      cellSizeDistribution: {
        [sampleId]: {
          auto: true,
          filterSettings: {
            minCellSize: 516,
            binStep: 200,
          },
          defaultFilterSettings: {
            minCellSize: 516,
            binStep: 200,
          },
        },
        enabled: false,
      },
      classifier: {
        [sampleId]: {
          auto: true,
          filterSettings: {
            FDR: 0.01,
          },
          prefiltered: true,
          defaultFilterSettings: {
            FDR: 0.01,
          },
        },
        prefiltered: true,
        filterSettings: {
          FDR: 0.01,
        },
        enabled: false,
      },
      dataIntegration: {
        dataIntegration: {
          method: 'harmony',
          methodSettings: {
            harmony: {
              numGenes: 2000,
              normalisation: 'logNormalize',
            },
            fastmnn: {
              numGenes: 2000,
              normalisation: 'logNormalize',
            },
            seuratv4: {
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
          excludeGeneCategories: [],
          numPCs: 30,
        },
      },
      mitochondrialContent: {
        [sampleId]: {
          auto: true,
          filterSettings: {
            method: 'absolute_threshold',
            methodSettings: {
              absolute_threshold: {
                maxFraction: 0.1,
                binStep: 0.05,
              },
            },
          },
          defaultFilterSettings: {
            method: 'absolute_threshold',
            methodSettings: {
              absolute_threshold: {
                maxFraction: 0.1,
                binStep: 0.05,
              },
            },
          },
        },
        enabled: true,
      },
      configureEmbedding: {
        embeddingSettings: {
          method: 'umap',
          methodSettings: {
            tsne: {
              perplexity: 9.18,
              learningRate: 200,
            },
            umap: {
              minimumDistance: 0.3,
              distanceMetric: 'cosine',
            },
          },
        },
        clusteringSettings: {
          method: 'louvain',
          methodSettings: {
            louvain: {
              resolution: 0.8,
            },
          },
        },
      },
      numGenesVsNumUmis: {
        [sampleId]: {
          auto: true,
          filterSettings: {
            regressionType: 'gam',
            regressionTypeSettings: {
              gam: {
                'p.level': 0.001,
              },
            },
          },
          defaultFilterSettings: {
            regressionType: 'gam',
            regressionTypeSettings: {
              gam: {
                'p.level': 0.001,
              },
            },
          },
        },
        enabled: true,
      },
      doubletScores: {
        auto: true,
        [sampleId]: {
          auto: true,
          auth_JWT: '',
          filterSettings: {
            probabilityThreshold: 0.7622447,
            binStep: 0.05,
          },
          defaultFilterSettings: {
            probabilityThreshold: 0.7622447,
            binStep: 0.05,
          },
        },
        enabled: true,
      },
    };
  }

  getExperiment() {
    return {
      processingConfig: this.processingConfig,
      lastViewed: '2021-10-19T13:50:39.724Z',
      apiVersion: '2.0.0-data-ingest-seurat-rds-automated',
      createdDate: '2021-10-18T21:18:10.511Z',
      meta: {
        pipeline: {
          stateMachineArn: '',
          executionArn: '',
        },
        gem2s: {
          paramsHash: '',
          stateMachineArn: '',
          executionArn: '',
        },
        organism: null,
        type: '10x',
      },
      sampleIds: this.sampleIds,
      description: 'Analysis description',
      experimentId: this.experimentId,
      projectId: this.projectId,
      experimentName: 'experimentName',
    };
  }

  getProject() {
    return {
      metadataKeys: [],
      createdDate: '2021-10-18T21:18:10.510Z',
      experiments: [this.experimentId],
      name: 'projectName',
      description: 'projectDescription',
      lastAnalyzed: '2021-10-19T13:50:39.724Z',
      lastModified: '2021-10-19T13:50:39.726Z',
      uuid: this.projectId,
      samples: this.sampleIds,
    };
  }
}

module.exports = MockDataFactory;
