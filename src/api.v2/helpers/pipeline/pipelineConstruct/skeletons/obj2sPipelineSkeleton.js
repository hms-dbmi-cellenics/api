const { END_OF_PIPELINE } = require('../../../../constants');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');

const obj2sPipelineSteps = {
  DownloadObj2sFile: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'downloadObj2sFile',
    },
    Next: 'ProcessObj2s',
    XCatch: createCatchSteps(),
  },
  ProcessObj2s: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'processObj2s',
    },
    Next: 'UploadObj2sToAWS',
    XCatch: createCatchSteps(),
  },
  UploadObj2sToAWS: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'uploadObj2sToAWS',
    },
    Next: END_OF_PIPELINE,
    XCatch: createCatchSteps(),
  },
};

module.exports = { obj2sPipelineSteps };
