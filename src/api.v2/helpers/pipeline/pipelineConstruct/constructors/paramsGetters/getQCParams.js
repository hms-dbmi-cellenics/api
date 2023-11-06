const getQCParams = (context, stepArgs) => {
  const { perSample, uploadCountMatrix, taskName } = stepArgs;

  return {
    ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
    authJWT: context.authJWT,
    config: context.processingConfig[taskName] || {},
    metadataS3Path: context.metadataS3Path,
  };
};

module.exports = getQCParams;
