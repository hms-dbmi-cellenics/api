const hash = require('object-hash');
const config = require('../../../config');
const getExperimentBackendStatus = require('../backendStatus/getExperimentBackendStatus');

const createObjectHash = (object) => hash.MD5(object);

const generateETag = async (
  experimentId,
  body,
  extraDependencies,
  extras,
  cacheUniquenessKey = null,
) => {
  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;

  const { workerVersion } = config;

  const ETagBody = {
    experimentId,
    qcPipelineStartDate: qcPipelineStartDate.toISOString(),
    extras,
    cacheUniquenessKey,
    workerVersion,
    extraDependencies,
  };

  // They `body` key to create ETAg for gene expression is different
  // from the others, causing the generated ETag to be different
  const bodyKey = body.name === 'GeneExpression' ? 'missingGenesBody' : 'body';
  ETagBody[bodyKey] = body;

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
