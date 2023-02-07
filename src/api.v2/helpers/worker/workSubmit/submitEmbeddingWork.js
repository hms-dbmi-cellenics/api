const hash = require('object-hash');
const validateAndSubmitWork = require('../../../events/validateAndSubmitWork');
const getExperimentBackendStatus = require('../../backendStatus/getExperimentBackendStatus');

const createObjectHash = (object) => hash.MD5(object);


const submitEmbeddingWork = async (message) => {
  console.log('payload ', message);

  const {
    experimentId, input:
    { authJWT, config: { embeddingSettings: { method, methodSettings } } },
  } = message;

  const config = methodSettings[method];
  // consider replacing with getPipelineStatus
  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;


  console.log(`qcPipelineStartDate: ${qcPipelineStartDate} ${typeof (qcPipelineStartDate)}`);
  const body = {
    name: 'GetEmbedding',
    type: method,
    config,
  };

  const cacheUniquenessKey = null;

  const extras = undefined;
  const extraDependencies = [];
  const workerVersion = 3;
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
