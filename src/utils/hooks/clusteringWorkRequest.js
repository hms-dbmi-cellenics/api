const workRequestBuilder = require('../workRequestBuilder');

const clusteringWorkRequest = async (payload) => {
  // Run work request for cell clustering
  const clusteringWorkConfig = {
    experimentId: payload.experimentId,
    body: {
      name: 'ClusterCells',
      cellSetName: 'Louvain clusters',
      cellSetKey: 'louvain',
      type: payload.output.config.clusteringSettings.method,
      config: payload.output.config.clusteringSettings.methodSettings[
        payload.output.config.clusteringSettings.method
      ],
    },
    PipelineRunETag: payload.statusRes.pipeline.startDate,
  };

  const workRequest = await workRequestBuilder('ClusterCells', clusteringWorkConfig);
  return workRequest;
};

module.exports = clusteringWorkRequest;
