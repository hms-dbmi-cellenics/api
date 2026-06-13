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
    XCatch: createCatchSteps(),
    Next: END_OF_PIPELINE,
  },
};

// Spatial technologies (e.g. Visium HD) skip emptyDrops and doubletScores:
// cells are defined by segmentation so empty drop detection and doublet
// scoring are not applicable.
const gem2SSpatialPipelineSteps = {
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
    XCatch: createCatchSteps(),
    Next: END_OF_PIPELINE,
  },
};

const SPATIAL_TECHNOLOGIES = ['visium_hd'];

const getGem2sPipelineSteps = (technology) => (
  SPATIAL_TECHNOLOGIES.includes(technology) ? gem2SSpatialPipelineSteps : gem2SPipelineSteps
);

module.exports = {
  gem2SPipelineSteps, gem2SSpatialPipelineSteps, getGem2sPipelineSteps, SPATIAL_TECHNOLOGIES,
};
