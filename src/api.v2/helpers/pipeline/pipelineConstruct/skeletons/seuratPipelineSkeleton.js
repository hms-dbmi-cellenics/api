const { END_OF_PIPELINE } = require('../../../../constants');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');

const seuratPipelineSteps = {
  DownloadSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'downloadSeurat',
    },
    Next: 'ProcessSeurat',
    XCatch: createCatchSteps(),
  },
  ProcessSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'processSeurat',
    },
    Next: 'UploadSeuratToAWS',
    XCatch: createCatchSteps(),
  },
  UploadSeuratToAWS: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'uploadSeuratToAWS',
    },
    Next: END_OF_PIPELINE,
    XCatch: createCatchSteps(),
  },
};

module.exports = { seuratPipelineSteps };
