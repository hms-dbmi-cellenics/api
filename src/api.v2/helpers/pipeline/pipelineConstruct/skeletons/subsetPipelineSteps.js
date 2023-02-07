const { END_OF_PIPELINE } = require('../../../../constants');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');

const subsetPipelineSteps = {
  SubsetSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'subsetSeurat',
    },
    XCatch: createCatchSteps(),
    Next: 'PrepareExperiment',
  },
  PrepareExperiment: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'prepareExperiment',
    },
    XCatch: createCatchSteps(),
    Next: 'UploadToAWS',
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

module.exports = subsetPipelineSteps;
