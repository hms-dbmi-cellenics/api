const WorkSubmitService = require('../helpers/worker/workSubmit');
const validateRequest = require('../../utils/schema-validator');
const getPipelineStatus = require('../helpers/pipeline/getPipelineStatus');

const bucketNames = require('../../config/bucketNames');

const pipelineConstants = require('../constants');
const { getSignedUrl } = require('../helpers/s3/signedUrl');
const generateEmbeddingETag = require('../helpers/worker/generateEmbeddingETag');

const checkSomeEqualTo = (array, testValue) => array.some((item) => item === testValue);

// adds Embedding ETag to workRequest because the worker needs it to download
// the corresponding worker result containing the embeddings
const addEmbeddingEtag = async (experimentId, workRequest) => {
  if (workRequest.body.name === 'DownloadAnnotSeuratObject') {
    workRequest.body.embeddingETag = await generateEmbeddingETag(experimentId);
  }
  if (['GetTrajectoryAnalysisStartingNodes', 'GetTrajectoryAnalysisPseudoTime'].includes(workRequest.body.name)) {
    workRequest.body.embedding.ETag = await generateEmbeddingETag(experimentId);
  }

  return workRequest;
};

const validateAndSubmitWork = async (req) => {
  let workRequest = req;
  const { experimentId } = workRequest;


  // Check if pipeline is runnning
  const { qc: { status: qcPipelineStatus } } = await getPipelineStatus(
    experimentId, pipelineConstants.QC_PROCESS_NAME,
  );

  const { seurat: { status: seuratPipelineStatus } } = await getPipelineStatus(
    experimentId, pipelineConstants.SEURAT_PROCESS_NAME,
  );

  if (!checkSomeEqualTo([qcPipelineStatus, seuratPipelineStatus], pipelineConstants.SUCCEEDED)) {
    throw new Error(`Work request can not be handled because pipeline is ${qcPipelineStatus} or seurat status is ${seuratPipelineStatus}`);
  }

  // add the embedding etag if the work request, needed by trajectory analysis & download seurat object
  workRequest = await addEmbeddingEtag(experimentId, workRequest);

  await validateRequest(workRequest, 'WorkRequest.v2.yaml');

  const { timeout } = workRequest;

  if (Date.parse(timeout) <= Date.now()) {
    throw new Error(`Request timed out at ${timeout}.`);
  }

  const signedUrl = await getSignedUrl(
    'getObject',
    {
      Bucket: bucketNames.WORKER_RESULTS,
      Key: workRequest.ETag,
    },
  );

  const workRequestToSubmit = {
    signedUrl,
    ...workRequest,
  };

  const workSubmitService = new WorkSubmitService(workRequestToSubmit);
  const podInfo = await workSubmitService.submitWork();

  return podInfo;
};


module.exports = validateAndSubmitWork;
