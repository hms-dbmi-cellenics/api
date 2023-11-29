const submitWorkForHook = require('./submitWorkForHook');

const submitEmbeddingWork = async (message) => {
  const {
    experimentId, input:
    { authJWT, config: { embeddingSettings: { method, methodSettings } } },
  } = message;

  const embeddingConfig = methodSettings[method];

  const body = {
    name: 'GetEmbedding',
    type: method,
    config: embeddingConfig,
  };


  const ETag = await submitWorkForHook(experimentId, authJWT, body);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitEmbeddingWork;
