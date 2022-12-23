const { END_OF_PIPELINE } = require('../../../../constants');

const gem2SPipelineSteps = {
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
    Next: END_OF_PIPELINE,
  },
};

module.exports = { gem2SPipelineSteps };
