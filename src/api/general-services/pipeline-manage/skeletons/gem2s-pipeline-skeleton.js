const config = require('../../../../config');

const gem2sPipelineSkeleton = {
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
      Next: 'PreProcessing',
    },
    PreProcessing: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        taskName: 'preproc',
      },
      Next: 'EmptyDrops',
    },
    EmptyDrops: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        taskName: 'emptyDrops',
      },
      Next: 'DoubletScores',
    },
    DoubletScores: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        taskName: 'doubletScores',
      },
      Next: 'CreateSeurat',
    },
    CreateSeurat: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        taskName: 'createSeurat',
      },
      Next: 'PrepareExperiment',
    },
    PrepareExperiment: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
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

module.exports = { gem2sPipelineSkeleton };
