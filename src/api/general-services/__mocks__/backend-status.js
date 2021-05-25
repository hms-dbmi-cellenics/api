const response = {
  gem2s: {
    completedSteps: [],
    startDate: null,
    status: 'NotCreated',
    stopDate: null,
  },
  qc: {
    completedSteps: [],
    startDate: null,
    status: 'NotCreated',
    stopDate: null,
  },
  worker: {
    ready: true,
    restartCount: 0,
    started: true,
    status: 'Running',
  },
};

const mockGetBackendStatus = jest.fn((experimentId) => new Promise((resolve, reject) => {
  if (experimentId === 'nonExistentId') {
    const err = new Error('Unkonwn project or sample');
    err.status = 404;

    reject(err);
  }

  resolve(response);
}));

module.exports = mockGetBackendStatus;
