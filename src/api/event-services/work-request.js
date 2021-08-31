const AWSXRay = require('aws-xray-sdk');
const WorkSubmitService = require('../general-services/work-submit');
const validateRequest = require('../../utils/schema-validator');
const getPipelineStatus = require('../general-services/pipeline-status');

const pipelineConstants = require('../general-services/pipeline-manage/constants');

const handleWorkRequest = async (workRequest) => {
  const { experimentId } = workRequest;

  // Check if pipeline is runnning
  const { qc: { status: qcPipelineStatus } } = await getPipelineStatus(
    experimentId, pipelineConstants.QC_PROCESS_NAME,
  );

  if (qcPipelineStatus !== pipelineConstants.SUCCEEDED) {
    const e = new Error(`Work request can not be handled because pipeline is ${qcPipelineStatus}`);

    AWSXRay.getSegment().addError(e);
    throw e;
  }

  await validateRequest(workRequest, 'WorkRequest.v1.yaml');
  const { timeout } = workRequest;

  if (Date.parse(timeout) <= Date.now()) {
    // Annotate current segment as expired.
    AWSXRay.getSegment().addAnnotation('result', 'error-timeout');

    throw new Error(`Request timed out at ${timeout}.`);
  }

  const workSubmitService = new WorkSubmitService(workRequest);
  await workSubmitService.submitWork();
};


module.exports = handleWorkRequest;
