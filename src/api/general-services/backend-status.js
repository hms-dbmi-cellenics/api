const pipelineStatus = require('./pipeline-status');
const workerStatus = require('./worker-status');


const getBackendStatus = async (experimentId) => {
  const [{ pipeline }, { worker }] = await Promise.all(
    [pipelineStatus(experimentId), workerStatus(experimentId)],
  );
  return {
    pipeline,
    worker,
  };
};

module.exports = getBackendStatus;
