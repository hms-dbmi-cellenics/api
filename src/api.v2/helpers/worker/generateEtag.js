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

  const backendStatus = await getExperimentBackendStatus(experimentId);
  const {
    pipeline: { startDate: qcStartDate },
    obj2s: { startDate: obj2sStartDate },
  } = backendStatus;

  // obj2s experiments never run the QC pipeline, so `qcStartDate` stays null and
  // always hashes to the same (epoch) date. That means re-uploading an obj2s
  // object would produce an identical ETag and the worker would serve stale
  // results from the previous upload (e.g. embeddings that no longer match the
  // freshly overwritten cell sets, making clusters appear misaligned). Fall back
  // to the obj2s pipeline start date so that re-running obj2s invalidates the
  // cached worker results. gem2s/QC experiments keep using the QC start date, so
  // their ETags are unchanged.
  const qcPipelineStartDate = qcStartDate || obj2sStartDate;

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
    requestProps,
    workerVersion,
    extraDependencies,
  };

  return createObjectHash(ETagBody);
};

module.exports = generateETag;
