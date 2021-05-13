const config = require('../../../config');


const pipelineSkeleton = {
  Comment: `Pipeline for clusterEnv '${config.clusterEnv}'`,
  StartAt: 'DeleteCompletedPipelineWorker',
  States: {
    DeleteCompletedPipelineWorker: {
      XStepType: 'delete-completed-jobs',
      Next: 'LaunchNewPipelineWorker',
      ResultPath: null,
    },
    LaunchNewPipelineWorker: {
      XStepType: 'create-new-job-if-not-exist',
      Next: 'ClassifierFilterMap',
      ResultPath: null,
    },
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
      },
      Next: 'ConfigureEmbedding',
    },
    ConfigureEmbedding: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        perSample: false,
        taskName: 'configureEmbedding',
        uploadCountMatrix: true,
      },
      Next: 'EndOfPipeline',
    },
    EndOfPipeline: {
      Type: 'Pass',
      End: true,
    },
  },
};


const gem2sSkeleton = {
  Comment: `Gem2s for clusterEnv '${config.clusterEnv}'`,
  StartAt: 'DeleteCompletedGem2SWorker',
  States: {
    DeleteCompletedGem2SWorker: {
      XStepType: 'delete-completed-jobs',
      Next: 'LaunchNewGem2SWorker',
      ResultPath: null,
    },
    LaunchNewGem2SWorker: {
      XStepType: 'create-new-job-if-not-exist',
      Next: 'DownloadGem',
      ResultPath: null,
    },
    DownloadGem: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        taskName: 'downloadGem',
        samples: '$.samples',
      },
      Next: 'PreProcessingMap',
      // ItemsPath: '$.samples',
      // Iterator: {
      //   StartAt: 'ClassifierFilter',
      //   States: {
      //     ClassifierFilter: {
      //       XStepType: 'create-new-step',
      //       XConstructorArgs: {
      //         perSample: true,
      //         taskName: 'classifier',
      //       },
      //       End: true,
      //     },
      //   },
      // },
    },
    PreProcessingMap: {
      Type: 'Map',
      Next: 'EmptyDropsMap',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'PreprocessingFilter',
        States: {
          PreprocessingFilter: {
            XStepType: 'create-new-step',
            XConstructorArgs: {
              perSample: true,
              taskName: 'preproc',
            },
            End: true,
          },
        },
      },
    },
    EmptyDropsMap: {
      Type: 'Map',
      Next: 'DoubletScoresMap',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'EmptyDrops',
        States: {
          EmptyDrops: {
            XStepType: 'create-new-step',
            XConstructorArgs: {
              perSample: true,
              taskName: 'emptyDrops',
            },
            End: true,
          },
        },
      },
    },
    DoubletScoresMap: {
      Type: 'Map',
      Next: 'CreateSeurat',
      ResultPath: null,
      ItemsPath: '$.samples',
      Iterator: {
        StartAt: 'DoubletScores',
        States: {
          DoubletScores: {
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
    CreateSeurat: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        perSample: false,
        taskName: 'createSeurat',
      },
      Next: 'PrepareExperiment',
    },
    PrepareExperiment: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        perSample: false,
        taskName: 'prepareExperiment',
      },
      Next: 'EndOfGem2S',
    },
    EndOfGem2S: {
      Type: 'Pass',
      End: true,
    },
  },
};

module.exports = { pipelineSkeleton, gem2sSkeleton };
