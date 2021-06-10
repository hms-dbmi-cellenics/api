const AWSXRay = require('aws-xray-sdk');
const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');
const { cacheSetResponse } = require('../../utils/cache-request');
const { handlePagination } = require('../../utils/handlePagination');
const ExperimentService = require('./experiment');

// const experimentService = new ExperimentService();

const NEW = 'NEW';
const DATA_UPDATE = 'data_update';

class WorkResponseService {
  constructor(io, workResponse) {
    return (async () => {
      await validateRequest(workResponse, 'WorkResponse.v1.yaml');
      this.workResponse = workResponse;
      this.io = io;
      return this;
    })();
  }

  async notifyDataUpdate(responseForClient) {
    const { experimentId } = responseForClient.request;

    // this should resend the request so the UI can replay it
    // instead of sending the data to everyone
    const response = {
      response: responseForClient,
      // request: responseForClient.request,
      status: NEW,
      type: DATA_UPDATE,
    };

    console.log('responseForClientDebug');
    console.log(responseForClient);

    if (responseForClient.request.body.name === 'ClusterCells') {
      const cellSets = JSON.parse(responseForClient.results[0].body);

      console.log('cellSetsDebug');
      console.log(cellSets);
      await (new ExperimentService()).updateLouvainCellSets(experimentId, cellSets);
    }

    logger.log('Sending to all clients subscribed to experiment', experimentId);
    this.io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
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

    // const { experimentId } = responseForClient.request;

    await this.notifyDataUpdate(responseForClient);

    if (socketId === 'no-socket') {
      logger.log('Socket is not provided, no response sent out.');
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
