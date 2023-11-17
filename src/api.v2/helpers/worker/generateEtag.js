const hash = require('object-hash');
const config = require('../../../config');
const getExperimentBackendStatus = require('../backendStatus/getExperimentBackendStatus');
const getExtraDependencies = require('./workSubmit/getExtraDependencies');

const createObjectHash = (object) => hash.MD5(object);

const generateETag = async (
  data,
) => {
  console.log('generateETag', data);
  const {
    experimentId,
    body,
    extras,
    cacheUniquenessKey = null,
  } = data;
  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;

  const { workerVersion } = config;

  const taskName = body.name;
  const extraDependencies = await getExtraDependencies(experimentId, taskName, body);

  // log the type and value of qcPipelineStartDate to make it easier to debug
  console.log('qcPipelineStartDate', typeof qcPipelineStartDate, qcPipelineStartDate);
  const ETagBody = {
    experimentId,
    body,
    qcPipelineStartDate: qcPipelineStartDate.toISOString(),
    extras,
    cacheUniquenessKey,
    workerVersion,
    extraDependencies,
  };


  console.log('ETagBody', ETagBody);

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
