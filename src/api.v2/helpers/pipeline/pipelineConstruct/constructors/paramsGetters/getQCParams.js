const getQCParams = (context, stepArgs) => {
  const { perSample, uploadCountMatrix, taskName } = stepArgs;

  return {
    ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
    authJWT: context.authJWT,
    config: context.processingConfig[taskName] || {},
    clusteringShouldRun: context.clusteringShouldRun,
  };
};

module.exports = getQCParams;
