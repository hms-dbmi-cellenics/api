const { END_OF_PIPELINE } = require('../../../../constants');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');

const copyPipelineSteps = {
  CopyS3Objects: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'copyS3Objects',
    },
    XCatch: createCatchSteps(),
    Next: END_OF_PIPELINE,
  },
};

module.exports = copyPipelineSteps;
