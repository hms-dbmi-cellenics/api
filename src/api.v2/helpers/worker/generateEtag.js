const hash = require('object-hash');
const config = require('../../../config');
const getExperimentBackendStatus = require('../backendStatus/getExperimentBackendStatus');
const getExtraDependencies = require('./workSubmit/getExtraDependencies');

const createObjectHash = (object) => hash.MD5(object);


// Disable unique keys to reallow reuse of work results in development
const DISABLE_UNIQUE_KEYS = [
  'GetEmbedding',
];

// we want to disable cache in staging & development
// however trajectory & download rds depend on the embedding's ETag so we have to
// disable the unique keys for the embeddings task
const getCacheUniquenessKey = (taskName) => {
  // allow people to enable cache in development by setting USE_CACHE=true
  if (process.env.USE_CACHE === 'true') {
    return null;
  }

  if (config.clusterEnv !== 'production' && !DISABLE_UNIQUE_KEYS.includes(taskName)) {
    return Math.random();
  }
  return null;
};

const generateETag = async (
  data,
) => {
  const {
    experimentId,
    body,
    extras,
  } = data;

  const cacheUniquenessKey = getCacheUniquenessKey(body.name);

  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;

  const { workerVersion } = config;

  const taskName = body.name;
  const extraDependencies = await getExtraDependencies(experimentId, taskName, body);

  // Check if qcPipelineStartDate is a string or a Date object, some old experiments at least in
  // staging have string dates so we'll avoid breaking them.
  const qcPipelineStartDateStr = (qcPipelineStartDate instanceof Date)
    ? qcPipelineStartDate.toISOString()
    : new Date(qcPipelineStartDate).toISOString();

  // log the type and value of qcPipelineStartDate to make it easier to debug
  const ETagBody = {
    experimentId,
    body,
    qcPipelineStartDate: qcPipelineStartDateStr,
    extras,
    cacheUniquenessKey,
    workerVersion,
    extraDependencies,
  };

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
