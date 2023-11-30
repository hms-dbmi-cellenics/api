const submitWorkForHook = require('./submitWorkForHook');

const submitEmbeddingWork = async (message) => {
  const {
    experimentId, input:
    { authJWT, config: { embeddingSettings: { method, methodSettings, useSaved } } },
  } = message;

  // useSaved is set when using seurat embeddings so we use the embeddings in the uploaded
  // object instead of computing new ones. In this case, we don't need to precompute them
  // on this pipeline hook.
  if (useSaved) {
    return null;
  }

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
