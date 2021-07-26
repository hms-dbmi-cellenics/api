
const crypto = require('crypto');
const AWSXRay = require('aws-xray-sdk');
const AWS = require('../../../utils/requireAWS');
const createWorkerResources = require('./create-worker-k8s');
const config = require('../../../config');
const logger = require('../../../utils/logging');


class WorkSubmitService {
  constructor(workRequest) {
    this.workRequest = workRequest;

    this.workerHash = crypto
      .createHash('sha1')
      .update(`${this.workRequest.experimentId}-${config.sandboxId}`)
      .digest('hex');

    if (config.clusterEnv === 'development') {
      this.workQueueName = 'development-queue.fifo';
    } else {
      this.workQueueName = `queue-job-${this.workerHash}-${config.clusterEnv}.fifo`;
    }
  }

  /**
   * Creates or locates an SQS queue for the appropriate
   * worker.
   */
  async createQueue() {
    const sqs = new AWS.SQS({
      region: config.awsRegion,
    });
    const q = await sqs.createQueue({
      QueueName: this.workQueueName,
      Attributes: {
        FifoQueue: 'true',
        ContentBasedDeduplication: 'true',
      },
    }).promise();

    const { QueueUrl: queueUrl } = q;

    return queueUrl;
  }

  /**
   * Returns a `Promise` to send an appropriately
   * formatted task to the Job via an SQS queue.
   * @param {string} queueUrl adsas
   */
  async sendMessageToQueue(queueUrl) {
    logger.log(`Sending message to queue ${queueUrl}...`);
    const sqs = new AWS.SQS({
      region: config.awsRegion,
    });

    await sqs.sendMessage({
      MessageBody: JSON.stringify(this.workRequest),
      QueueUrl: queueUrl,
      MessageGroupId: 'work',
    }).promise();
  }

  async getQueueAndHandleMessage() {
    try {
      let queueUrl = '';

      if (config.clusterEnv === 'development') {
        queueUrl = 'http://localhost:4566/000000000000/development-queue.fifo';
      } else {
        const accountId = await config.awsAccountIdPromise;
        queueUrl = `https://sqs.${config.awsRegion}.amazonaws.com/${accountId}/${this.workQueueName}`;
      }

      await this.sendMessageToQueue(queueUrl);
    } catch (error) {
      if (error.code !== 'AWS.SimpleQueueService.NonExistentQueue') { throw error; }
      const queueUrl = await this.createQueue();
      await this.sendMessageToQueue(queueUrl);
    }
    return 'success';
  }

  /**
   * Launches a Kubernetes `Job` with the appropriate configuration.
   */
  async createWorker() {
    if (config.clusterEnv === 'development' || config.clusterEnv === 'test') {
      logger.log('Not creating a worker because we are running locally...');

      return;
    }

    await createWorkerResources(this);
  }

  async submitWork() {
    AWSXRay.getSegment().addAnnotation('result', 'success-worker');
    AWSXRay.getSegment().close();

    await Promise.all([
      new Promise((resolve, reject) => {
        AWSXRay.captureAsyncFunc('WorkSubmitService.getQueueAndHandleMessage', async (subsegment) => {
          try {
            const response = await this.getQueueAndHandleMessage();
            resolve(response);
          } catch (error) {
            reject(error);
          } finally {
            subsegment.close();
          }
        });
      }),
      this.createWorker(),
    ]);
  }
}

module.exports = WorkSubmitService;
