const WorkSubmitService = require('../helpers/worker/workSubmit');
const validateRequest = require('../../utils/schema-validator');
const getPipelineStatus = require('../helpers/pipeline/getPipelineStatus');

const bucketNames = require('../../config/bucketNames');

const pipelineConstants = require('../constants');
const { getSignedUrl } = require('../helpers/s3/signedUrl');

const checkSomeEqualTo = (array, testValue) => array.some((item) => item === testValue);

const validateAndSubmitWork = async (ETag, data) => {
  const { experimentId } = data;


  // Check if pipeline is runnning
  const { qc: { status: qcPipelineStatus } } = await getPipelineStatus(
    experimentId, pipelineConstants.QC_PROCESS_NAME,
  );

  const { seurat: { status: seuratPipelineStatus } } = await getPipelineStatus(
    experimentId, pipelineConstants.SEURAT_PROCESS_NAME,
  );

  if (!checkSomeEqualTo([qcPipelineStatus, seuratPipelineStatus], pipelineConstants.SUCCEEDED)) {
    const e = new Error(`Work request can not be handled because pipeline is ${qcPipelineStatus} or seurat status is ${seuratPipelineStatus}`);

    throw e;
  }

  const workRequest = { ...data, ETag };
  await validateRequest(workRequest, 'WorkRequest.v2.yaml');

  const { timeout } = workRequest;

  if (Date.parse(timeout) <= Date.now()) {
    throw new Error(`Request timed out at ${timeout}.`);
  }

  const signedUrl = await getSignedUrl(
    'getObject',
    {
      Bucket: bucketNames.WORKER_RESULTS,
      Key: ETag,
    },
  );

  const workRequestToSubmit = {
    signedUrl,
    ...workRequest,
  };

  // TODO consider removing the podInfo stuff
  const workSubmitService = new WorkSubmitService(workRequestToSubmit);
  const podInfo = await workSubmitService.submitWork();

  return podInfo;
};


module.exports = validateAndSubmitWork;
