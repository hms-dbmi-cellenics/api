const Experiment = require('../../model/Experiment');
const generateETag = require('./generateEtag');

const generateEmbeddingETag = async (experimentId) => {
  const {
    processingConfig,
  } = await new Experiment().findById(experimentId).first();

  const {
    configureEmbedding: {
      embeddingSettings,
    },
  } = processingConfig;

  const embeddingBody = {
    name: 'GetEmbedding',
    type: embeddingSettings.method,
    config: embeddingSettings.methodSettings[embeddingSettings.method],
  };

  const bodyForEtag = {
    experimentId,
    body: embeddingBody,
    requestProps: {
      broadcast: false,
      cacheUniquenessKey: null,
    },
  };

  return generateETag(bodyForEtag);
};

module.exports = generateEmbeddingETag;
