const AWSXRay = require('aws-xray-sdk');
const WorkSubmitService = require('../general-services/work-submit');
const logger = require('../../utils/logging').defaultLogger;
const { cacheGetRequest } = require('../../utils/cache-request');
const { CacheMissError } = require('../../cache/cache-utils');
const { handlePagination } = require('../../utils/handlePagination');
const validateRequest = require('../../utils/schema-validator');
const getPipelineStatus = require('../general-services/pipeline-status');

const pipelineConstants = require('../general-services/pipeline-manage/constants');

const handleWorkRequest = async (workRequest, socket) => {
  const { uuid, pagination, experimentId } = workRequest;

  // Check if pipeline is runnning
  const { qc: { status: qcPipelineStatus } } = await getPipelineStatus(
    experimentId, pipelineConstants.QC_PROCESS_NAME,
  );

  if (qcPipelineStatus !== pipelineConstants.SUCCEEDED) {
    const e = new Error(`Work request can not be handled because pipeline is ${qcPipelineStatus}`);

    AWSXRay.getSegment().addError(e);
    throw e;
  }

  try {
    logger.log(`[REQ ${uuid}, SOCKET ${socket.id}] Trying to fetch response from cache...`);
    const cachedResponse = await cacheGetRequest(workRequest);

    if (pagination) {
      logger.log(`[REQ ${uuid}, SOCKET ${socket.id}] We found a cached response, pagination needed. Processing response...`);
      cachedResponse.results = handlePagination(cachedResponse.results, pagination);
    } else {
      logger.log(`[REQ ${uuid}, SOCKET ${socket.id}] We found a cached response, no pagination needed.`);
    }

    socket.emit(`WorkResponse-${uuid}`, cachedResponse);
    logger.log(`[REQ ${uuid}, SOCKET ${socket.id}] Response sent back from cache.`);
  } catch (e) {
    if (e instanceof CacheMissError) {
      logger.log(`[REQ ${uuid}, SOCKET ${socket.id}] Cache miss error: ${e}`);
      logger.log(`[REQ ${uuid}, SOCKET ${socket.id}] Forwarding to worker...`);

      await validateRequest(workRequest, 'WorkRequest.v1.yaml');
      const { timeout } = workRequest;
      if (Date.parse(timeout) <= Date.now()) {
        // Annotate current segment as expired.
        AWSXRay.getSegment().addAnnotation('result', 'error-timeout');

        throw new Error(`Request timed out at ${timeout}.`);
      }

      const workSubmitService = new WorkSubmitService(workRequest);
      await workSubmitService.submitWork();
    } else {
      logger.log(`[REQ ${uuid}, SOCKET ${socket.id}] Unexpected error while processing cached response.`);
      logger.trace(e);
      AWSXRay.getSegment().addError(e);
    }
  }
};


module.exports = handleWorkRequest;
