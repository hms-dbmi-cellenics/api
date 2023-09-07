const hash = require('object-hash');
const config = require('../../../config');
const getExperimentBackendStatus = require('../backendStatus/getExperimentBackendStatus');

const createObjectHash = (object) => hash.MD5(object);

const generateETag = async (experimentId, body, extraDependencies) => {
  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;

  const { workerVersion } = config;

  const ETagBody = {
    experimentId,
    body,
    qcPipelineStartDate: qcPipelineStartDate.toISOString(),
    workerVersion,
    extraDependencies,
  };

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
