const { END_OF_PIPELINE } = require('../../../../constants');
const { timeoutErrorHandler } = require('../constructors/createHandleErrorStep');

const gem2SPipelineSteps = {
  DownloadGem: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'downloadGem',
    },
    Next: 'PreProcessing',
    XCatch: [timeoutErrorHandler()],
  },
  PreProcessing: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'preproc',
    },
    Next: 'EmptyDrops',
    XCatch: [timeoutErrorHandler()],
  },
  EmptyDrops: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'emptyDrops',
    },
    Next: 'DoubletScores',
    XCatch: [timeoutErrorHandler()],
  },
  DoubletScores: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'doubletScores',
    },
    Next: 'CreateSeurat',
    XCatch: [timeoutErrorHandler()],
  },
  CreateSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'createSeurat',
    },
    Next: 'PrepareExperiment',
    XCatch: [timeoutErrorHandler()],
  },
  PrepareExperiment: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'prepareExperiment',
    },
    Next: 'UploadToAWS',
    XCatch: [timeoutErrorHandler()],
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
