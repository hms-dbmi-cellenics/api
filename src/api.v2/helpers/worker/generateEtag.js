const hash = require('object-hash');
const config = require('../../../config');
const getExperimentBackendStatus = require('../backendStatus/getExperimentBackendStatus');
const getExtraDependencies = require('./workSubmit/getExtraDependencies');

const createObjectHash = (object) => hash.MD5(object);


const generateETag = async (
  data,
) => {
  const {
    experimentId,
    body,
    requestProps,
  } = data;

  let cacheUniquenessKey = null;
  if (requestProps && requestProps.cacheUniquenessKey) {
    cacheUniquenessKey = requestProps.cacheUniquenessKey;
  }

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
    cacheUniquenessKey,
    workerVersion,
    extraDependencies,
  };

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
