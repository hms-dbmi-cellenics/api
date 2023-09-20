const hash = require('object-hash');
const config = require('../../../config');
const getExperimentBackendStatus = require('../backendStatus/getExperimentBackendStatus');

const createObjectHash = (object) => hash.MD5(object);

const generateETag = async (
  experimentId,
  body,
  extras,
  extraDependencies,
  disableCache,
) => {
  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;

  const { workerVersion } = config;
  const cacheUniquenessKey = disableCache ? Math.random() : null;

  let ETagBody;
  // They `body` key to create ETAg for gene expression is different
  // from the others, causing the generated ETag to be different
  if (body.name === 'GeneExpression') {
    ETagBody = {
      experimentId,
      missingGenesBody: body,
      qcPipelineStartDate: qcPipelineStartDate.toISOString(),
      extras,
      cacheUniquenessKey,
      workerVersion,
      extraDependencies,
    };
  } else {
    ETagBody = {
      experimentId,
      body,
      qcPipelineStartDate: qcPipelineStartDate.toISOString(),
      extras,
      cacheUniquenessKey,
      workerVersion,
      extraDependencies,
    };
  }

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
