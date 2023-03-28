
const mockGetWorkerStatus = jest.fn(
  (experimentId) => new Promise((resolve, reject) => {
    if (experimentId === 'nonExistentId') {
      const err = new Error('Unkonwn project or sample');
      err.status = 404;

      reject(err);
    }

    const response = {
      worker: {
        ready: true, restartCount: 0, started: true, status: 'Running',
      },
    };

    resolve(response);
  }),
);

module.exports = mockGetWorkerStatus;
