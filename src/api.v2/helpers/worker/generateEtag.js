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

  const extraDependencies = await getExtraDependencies(experimentId, body.name, body);
  // TODO need to add the new mechanism to avoid extraDependencies
  const ETagBody = {
    experimentId,
    body,
    qcPipelineStartDate: qcPipelineStartDate.toISOString(),
    extras,
    cacheUniquenessKey,
    workerVersion,
    extraDependencies,
  };

  // They `body` key to create ETAg for gene expression is different
  // from the others, causing the generated ETag to be different
  // TODO remove this
  console.log('ETagBody', ETagBody);
  // experimentId: '7da5be3a-ecf5-429b-b6d2-a92df2a719eb',
  //   qcPipelineStartDate: '2023-10-25T14:10:44.904Z',
  //   extras: undefined,
  //   cacheUniquenessKey: null,
  //   workerVersion: 4,
  //   extraDependencies: [],
  //   body: { name: 'GetNGenes' }
  // }
  console.log('ETagBody', ETagBody);

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
