const config = require('../../../../config');
const validateAndSubmitWork = require('../../../events/validateAndSubmitWork');
const getExperimentBackendStatus = require('../../backendStatus/getExperimentBackendStatus');
const createObjectHash = require('../createObjectHash');


const submitWork = async (experimentId, authJWT, body, extraDependencies) => {
  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;


  // these values need to match explicitly the default ones defined in the UI at
  // src/utils/work/fetchWork.js when calling the function generateETag if this file
  // or the one in the UI has any default changed, the pre-computing of embeddings/marker heatmp
  // will stop working as the ETags will no longer match.
  const cacheUniquenessKey = null;
  const extras = undefined;
  const { workerVersion } = config;

  const ETagBody = {
    experimentId,
    body,
    qcPipelineStartDate: qcPipelineStartDate.toISOString(),
    extras,
    cacheUniquenessKey,
    workerVersion,
    extraDependencies,
  };

  const ETag = createObjectHash(ETagBody);
  const now = new Date();
  const timeout = 15 * 60 * 1000; // 15min in ms
  const timeoutDate = new Date(now.getTime() + timeout);
  const request = {
    ETag,
    socketId: 'randomID',
    experimentId,
    authJWT,
    timeout: timeoutDate.toISOString(),
    body,
  };

  await validateAndSubmitWork(request);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitWork;
