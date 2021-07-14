const AWSXRay = require('aws-xray-sdk');
const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');
const { cacheSetResponse } = require('../../utils/cache-request');
const { handlePagination } = require('../../utils/handlePagination');
const ExperimentService = require('./experiment');

const NEW = 'NEW';
const WORKER_DATA_UPDATE = 'workerDataUpdate';

const persistUpdates = async (experimentId, responseForClient) => {
  const taskName = responseForClient.request.body.name;

  if (taskName === 'ClusterCells') {
    const cellSets = JSON.parse(responseForClient.results[0].body);

    await (new ExperimentService()).updateLouvainCellSets(experimentId, cellSets);
  }
};

class WorkResponseService {
  constructor(io, workResponse) {
    return (async () => {
      console.log('workResponseCreate');
      await validateRequest(workResponse, 'WorkResponse.v1.yaml');
      console.log('workResponseCreateValidated');
      this.workResponse = workResponse;
      this.io = io;
      return this;
    })();
  }

  // eslint-disable-next-line class-methods-use-this
  async processS3PathType(workResponse) {
    const s3Promises = [];
    const s3 = new AWS.S3();

    workResponse.results
      .filter((result) => result.type === 's3-path')
      .forEach((result) => {
        const fullPath = result.body.split('/');

        const params = {
          Bucket: fullPath[0],
          Key: fullPath.slice(1).join('/'),
          ResponseContentType: result['content-type'],
          ResponseContentEncoding: result['content-encoding'] || 'utf-8',
        };

        s3Promises.push(s3.getObject(params).promise());
      });

    const result = await Promise.all(s3Promises).then((values) => {
      const processed = [];

      values.forEach((value) => {
        processed.push({
          'content-type': value.ContentType,
          'content-encoding': value.ContentEncoding,
          body: value.Body.toString(value.ContentEncoding),
        });
      });

      return processed;
    });

    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  async processInlineType(workResponse) {
    const inlineResults = workResponse.results
      .filter((result) => result.type === 'inline')
      .map((result) => {
        // eslint-disable-next-line no-param-reassign
        delete result.type;
        return result;
      });

    return inlineResults;
  }

  async handleResponse() {
    console.log('handleResponse');
    console.log(JSON.stringify(this.workResponse));
    let processedResults = await Promise.all(
      [this.processS3PathType(this.workResponse), this.processInlineType(this.workResponse)],
    );

    processedResults = processedResults.flat();

    const responseForClient = this.workResponse;
    responseForClient.results = processedResults;
    const {
      uuid, socketId, timeout, pagination,
    } = responseForClient.request;

    this.socketId = socketId;
    this.uuid = uuid;

    const { cacheable } = responseForClient.response;
    responseForClient.response.trace = AWSXRay.getSegment().trace_id;

    try {
      if (cacheable) {
        logger.log('Response will be cached.');
        await cacheSetResponse(responseForClient);
      } else {
        logger.log('Skipping caching as `cacheable` is set to false.');
      }

      // Order results according to the pagination
      if (pagination) {
        responseForClient.results = handlePagination(processedResults, pagination);
      }
    } catch (e) {
      logger.error('Error trying to cache or paginate data: ', e);
      throw e;
    }

    console.log('socketIdDebug');
    console.log(socketId);

    if (socketId === 'broadcast') {
      const response = {
        response: responseForClient,
        status: NEW,
        type: WORKER_DATA_UPDATE,
      };

      const { experimentId } = responseForClient.request;

      console.log('responseForClientDebug');
      console.log(responseForClient);

      logger.log('Sending work response to all clients subscribed to experiment', experimentId);
      this.io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);

      if (!responseForClient.response.error) {
        await persistUpdates(experimentId, responseForClient);
      }

      return;
    }

    if (Date.parse(timeout) > Date.now()) {
      this.io.to(socketId).emit(`WorkResponse-${uuid}`, responseForClient);
      logger.log('Work response sent out.');
    } else {
      logger.log(`Work response not sent out as timeout of ${timeout} has expired.`);
    }
  }
}

module.exports = WorkResponseService;
