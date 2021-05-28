const constants = require('../../api/general-services/pipeline-manage/constants');
const workRequestBuilder = require('../workRequestBuilder');

const embeddingWorkRequest = async (payload) => {
  const { experimentId, output, statusRes } = payload;

  // Run work request for embedding
  const embeddingWorkConfig = {
    experimentId,
    body: {
      name: 'GetEmbedding',
      type: output.config.embeddingSettings.method,
      config: output.config.embeddingSettings.methodSettings[
        output.config.embeddingSettings.method
      ],
    },
    PipelineRunETag: statusRes[constants.OLD_QC_NAME_TO_BE_REMOVED].startDate,
  };

  const workRequest = await workRequestBuilder('GetEmbedding', embeddingWorkConfig);
  workRequest.submitWork();
};

module.exports = embeddingWorkRequest;
