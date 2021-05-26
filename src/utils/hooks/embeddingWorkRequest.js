const constants = require('../../api/general-services/pipeline-manage/constants');
const workRequestBuilder = require('../workRequestBuilder');

const embeddingWorkRequest = async (payload) => {
  // Run work request for embedding
  const embeddingWorkConfig = {
    experimentId: payload.experimentId,
    body: {
      name: 'GetEmbedding',
      type: payload.output.config.embeddingSettings.method,
      config: payload.output.config.embeddingSettings.methodSettings[
        payload.output.config.embeddingSettings.method
      ],
    },
    PipelineRunETag: payload.statusRes[constants.OLD_QC_NAME_TO_BE_REMOVED].startDate,
  };

  const workRequest = await workRequestBuilder('GetEmbedding', embeddingWorkConfig);
  workRequest.submitWork();
};

module.exports = embeddingWorkRequest;
