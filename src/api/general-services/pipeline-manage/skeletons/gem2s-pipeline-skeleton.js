const config = require('../../../../config');
const { firstStep, buildInitialSteps } = require('./initialization');

const gem2sPipelineSkeleton = {
  Comment: `Gem2s for clusterEnv '${config.clusterEnv}'`,
  StartAt: firstStep(),
  States: {
    ...buildInitialSteps('DownloadGem'),
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
      Next: 'UploadToAWS',
    },
    UploadToAWS: {
      XStepType: 'create-new-step',
      XConstructorArgs: {
        taskName: 'uploadToAWS',
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
