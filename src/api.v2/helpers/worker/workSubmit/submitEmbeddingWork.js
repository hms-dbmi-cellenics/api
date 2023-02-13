const hash = require('object-hash');
const config = require('../../../../config');
const validateAndSubmitWork = require('../../../events/validateAndSubmitWork');
const getExperimentBackendStatus = require('../../backendStatus/getExperimentBackendStatus');

const createObjectHash = (object) => hash.MD5(object);


const submitEmbeddingWork = async (message) => {
  console.log('payload ', message);

  const {
    experimentId, input:
    { authJWT, config: { embeddingSettings: { method, methodSettings } } },
  } = message;

  const embeddingConfig = methodSettings[method];
  // consider replacing with getPipelineStatus
  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;


  console.log(`qcPipelineStartDate: ${qcPipelineStartDate} ${typeof (qcPipelineStartDate)}`);
  const body = {
    name: 'GetEmbedding',
    type: method,
    embeddingConfig,
  };

  // these values need to match explicitly the default ones defined in the UI at
  // src/utils/work/fetchWork.js when calling the function generateETag if this file
  // or the one in the UI has any default changed, the pre-computing of embeddings/marker heatmp
  // will stop working as the ETags will no longer match.
  const cacheUniquenessKey = null;
  const extras = undefined;
  const extraDependencies = [];
  const workerVersion = { config };

  const ETagBody = {
    experimentId,
    body,
    qcPipelineStartDate: qcPipelineStartDate.toISOString(),
    extras,
    cacheUniquenessKey,
    workerVersion,
    extraDependencies,
  };

  console.log('embedding ETagBody: ', ETagBody);
  const ETag = createObjectHash(ETagBody);
  console.log('submitEmbeddingWork: embedding Etag ', ETag);

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
};

module.exports = submitEmbeddingWork;
