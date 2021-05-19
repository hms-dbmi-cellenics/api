const pipelineStatus = require('./pipeline-status');
const workerStatus = require('./worker-status');


const getBackendStatus = async (experimentId) => {
  const [
    { pipeline: gem2s },
    { pipeline: qc },
    { worker },
  ] = await Promise.all(
    [
      pipelineStatus('gem2s', experimentId),
      pipelineStatus('qc', experimentId),
      workerStatus(experimentId),
    ],
  );
  return {
    gem2s,
    qc,
    worker,
  };
};

module.exports = getBackendStatus;
