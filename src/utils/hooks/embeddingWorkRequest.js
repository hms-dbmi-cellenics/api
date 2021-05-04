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
    PipelineRunETag: payload.statusRes.pipeline.startDate,
  };

  const workRequest = await workRequestBuilder('GetEmbedding', embeddingWorkConfig);
  workRequest.submitWork();
};

module.exports = embeddingWorkRequest;
