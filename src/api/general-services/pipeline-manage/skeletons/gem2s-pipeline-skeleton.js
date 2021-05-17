const config = require('../../../../config');

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
      ItemsPath: '$',
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
      ItemsPath: '$',
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
      ItemsPath: '$',
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

module.exports = { gem2sSkeleton };
