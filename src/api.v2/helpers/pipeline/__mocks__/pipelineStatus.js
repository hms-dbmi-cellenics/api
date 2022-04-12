const pipelineConstants = require('../pipelineConstruct/constants');

const responseTemplates = {
  gem2s: {
    completedSteps: [],
    startDate: null,
    status: pipelineConstants.SUCCEEDED,
    stopDate: null,
  },
  qc: {
    completedSteps: [],
    startDate: null,
    status: pipelineConstants.SUCCEEDED,
    stopDate: null,
  },
  worker: {
    ready: true,
    restartCount: 0,
    started: true,
    status: pipelineConstants.RUNNING,
  },
};

const mockGetPipelineStatus = jest.fn(
  (experimentId, processName) => new Promise((resolve, reject) => {
    if (experimentId === 'nonExistentId') {
      const err = new Error('Unkonwn project or sample');
      err.status = 404;

      reject(err);
    }

    const response = { [processName]: responseTemplates[processName] };

    resolve(response);
  }),
);

module.exports = mockGetPipelineStatus;
module.exports.responseTemplates = responseTemplates;
