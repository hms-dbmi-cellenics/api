const createObjectHash = require('../createObjectHash');
const config = require('../../../../config');
const validateAndSubmitWork = require('../../../events/validateAndSubmitWork');
const getExperimentBackendStatus = require('../../backendStatus/getExperimentBackendStatus');
const getExtraDependencies = require('./getExtraDependencies');


const submitMarkerHeatmapWork = async (message) => {
  const { experimentId, input: { authJWT } } = message;

  const backendStatus = await getExperimentBackendStatus(experimentId);
  const { pipeline: { startDate: qcPipelineStartDate } } = backendStatus;
  const numGenes = 5;
  const selectedCellSet = 'louvain';

  const body = {
    name: 'MarkerHeatmap',
    nGenes: numGenes,
    cellSetKey: selectedCellSet,
  };

  const cacheUniquenessKey = null;

  const extras = undefined;
  const extraDependencies = await getExtraDependencies(body.name, message);
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

module.exports = submitMarkerHeatmapWork;
