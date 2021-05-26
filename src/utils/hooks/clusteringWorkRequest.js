const constants = require('../../api/general-services/pipeline-manage/constants');
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
    PipelineRunETag: payload.statusRes[constants.OLD_QC_NAME_TO_BE_REMOVED].startDate,
  };

  const workRequest = await workRequestBuilder('ClusterCells', clusteringWorkConfig);
  return workRequest;
};

module.exports = clusteringWorkRequest;
