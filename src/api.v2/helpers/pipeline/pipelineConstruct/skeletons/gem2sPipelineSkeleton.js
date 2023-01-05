const { END_OF_PIPELINE } = require('../../../../constants');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');

const gem2SPipelineSteps = {
  DownloadGem: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'downloadGem',
    },
    Next: 'PreProcessing',
    XCatch: createCatchSteps(),
  },
  PreProcessing: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'preproc',
    },
    Next: 'EmptyDrops',
    XCatch: createCatchSteps(),
  },
  EmptyDrops: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'emptyDrops',
    },
    Next: 'DoubletScores',
    XCatch: createCatchSteps(),
  },
  DoubletScores: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'doubletScores',
    },
    Next: 'CreateSeurat',
    XCatch: createCatchSteps(),
  },
  CreateSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'createSeurat',
    },
    Next: 'PrepareExperiment',
    XCatch: createCatchSteps(),
  },
  PrepareExperiment: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'prepareExperiment',
    },
    Next: 'UploadToAWS',
    XCatch: createCatchSteps(),
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
