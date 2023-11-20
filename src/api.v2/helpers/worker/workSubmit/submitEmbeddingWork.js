const submitWork = require('./submitWork');

const submitEmbeddingWork = async (message) => {
  const {
    experimentId, input:
    { authJWT, config: { embeddingSettings: { method, methodSettings, useSaved } } },
  } = message;

  const embeddingConfig = methodSettings[method];

  const body = {
    name: 'GetEmbedding',
    type: method,
    useSaved,
    config: embeddingConfig,
  };

  // these values need to match explicitly the default ones defined in the UI at
  // src/utils/work/fetchWork.js when calling the function generateETag if this file
  // or the one in the UI has any default changed, the pre-computing of embeddings/marker heatmp
  // will stop working as the ETags will no longer match.
  const extraDependencies = [];

  const ETag = await submitWork(experimentId, authJWT, body, extraDependencies);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitEmbeddingWork;
