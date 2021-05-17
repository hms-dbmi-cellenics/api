const pipelineStatus = require('./pipeline-status');
const gem2sStatus = require('./gem2s-status');
const workerStatus = require('./worker-status');


const getBackendStatus = async (experimentId) => {
  const [{ pipeline }, { worker }] = await Promise.all(
    [
      pipelineStatus(experimentId),
      gem2sStatus(experimentId),
      workerStatus(experimentId),
    ],
  );
  return {
    pipeline,
    worker,
  };
};

module.exports = getBackendStatus;
