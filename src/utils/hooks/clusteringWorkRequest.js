const constants = require('../../api/general-services/pipeline-manage/constants');
const workRequestBuilder = require('../workRequestBuilder');

const clusteringWorkRequest = async (payload) => {
  const { experimentId, output, statusRes } = payload;

  // Run work request for cell clustering
  const clusteringWorkConfig = {
    experimentId,
    body: {
      name: 'ClusterCells',
      cellSetName: 'Louvain clusters',
      cellSetKey: 'louvain',
      type: output.config.clusteringSettings.method,
      config: output.config.clusteringSettings.methodSettings[
        output.config.clusteringSettings.method
      ],
    },
    PipelineRunETag: statusRes[constants.OLD_QC_NAME_TO_BE_REMOVED].startDate,
  };

  // Temporary: add very long timeout
  const now = new Date();
  const addTimeoutSeconds = 60;
  const timeout = new Date(now.getTime() + 15 * addTimeoutSeconds * 1000);

  clusteringWorkConfig.body.config.timeout = timeout;

  const workRequest = await workRequestBuilder('ClusterCells', clusteringWorkConfig);
  workRequest.submitWork();
};

module.exports = clusteringWorkRequest;
