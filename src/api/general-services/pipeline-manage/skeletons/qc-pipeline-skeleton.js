const { firstStep, buildInitialSteps } = require('./initialization');

const getQcPipelineSkeleton = (clusterEnv) => ({
  Comment: `QC Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: firstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, 'ClassifierFilterMap'),
    ClassifierFilterMap: {
      Type: 'Map',
      Next: 'CellSizeDistributionFilterMap',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'ClassifierFilter',
        States: {
          ClassifierFilter: {
            XStepType: 'create-new-step',
            XConstructorArgs: {
              perSample: true,
              taskName: 'classifier',
            },
            End: true,
          },
        },
      },
    },
    CellSizeDistributionFilterMap: {
      Type: 'Map',
      Next: 'MitochondrialContentFilterMap',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'CellSizeDistributionFilter',
        States: {
          CellSizeDistributionFilter: {
            XStepType: 'create-new-step',
            XConstructorArgs: {
              perSample: true,
              taskName: 'cellSizeDistribution',
            },
            End: true,
          },
        },
      },
    },
    MitochondrialContentFilterMap: {
      Type: 'Map',
      Next: 'NumGenesVsNumUmisFilterMap',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'MitochondrialContentFilter',
        States: {
          MitochondrialContentFilter: {
            XStepType: 'create-new-step',
            XConstructorArgs: {
              perSample: true,
              taskName: 'mitochondrialContent',
            },
            End: true,
          },
        },
      },
    },
    NumGenesVsNumUmisFilterMap: {
      Type: 'Map',
      Next: 'DoubletScoresFilterMap',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'NumGenesVsNumUmisFilter',
        States: {
          NumGenesVsNumUmisFilter: {
            XStepType: 'create-new-step',
            XConstructorArgs: {
              perSample: true,
              taskName: 'numGenesVsNumUmis',
            },
            End: true,
          },
        },
      },
    },
    DoubletScoresFilterMap: {
      Type: 'Map',
      Next: 'DataIntegration',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'DoubletScoresFilter',
        States: {
          DoubletScoresFilter: {
            XStepType: 'create-new-step',
            XConstructorArgs: {
              perSample: true,
              taskName: 'doubletScores',
            },
            End: true,
          },
        },
      },
    },
    DataIntegration: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        perSample: false,
        taskName: 'dataIntegration',
        uploadCountMatrix: true,
      },
      Next: 'ConfigureEmbedding',
    },
    ConfigureEmbedding: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        perSample: false,
        taskName: 'configureEmbedding',
      },
      Next: 'EndOfPipeline',
    },
    EndOfPipeline: {
      Type: 'Pass',
      End: true,
    },
  },
});

module.exports = { getQcPipelineSkeleton };
