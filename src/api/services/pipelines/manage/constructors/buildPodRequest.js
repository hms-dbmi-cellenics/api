const buildPodRequest = (sandboxId, experimentId, taskName, processName, activityId) => ({
  taskName,
  experimentId,
  input: {
    experimentId, // remove once PipelineResponse.v1.yaml is refactored with gem2s one
    sandboxId,
    activityId,
    processName,
  },
});


module.exports = {
  buildPodRequest,
};
