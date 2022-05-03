
const crypto = require('crypto');
const AWSXRay = require('aws-xray-sdk');
const AWS = require('../../../../utils/requireAWS');
const createWorkerResources = require('./createWorkerK8s');
const config = require('../../../../config');
const getLogger = require('../../../../utils/getLogger');

const logger = getLogger();

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
    logger.log(`[REQ ${this.workRequest.uuid}] Sending message to queue ${queueUrl}...`);

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
      const queueUrls = [];

      if (config.clusterEnv === 'development') {
        queueUrls.push('http://localhost:4566/000000000000/development-queue.fifo');
      } else {
        const accountId = await config.awsAccountIdPromise;

        queueUrls.push(`https://sqs.${config.awsRegion}.amazonaws.com/${accountId}/${this.workQueueName}`);
      }

      await Promise.all(queueUrls.map((queueUrl) => this.sendMessageToQueue(queueUrl)));
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

      return {};
    }

    let numTries = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const podInfo = await createWorkerResources(this);
        return podInfo;
      } catch (e) {
        if (e.response && e.response.statusCode === 422) {
          logger.log('Could not assign experiment to worker (potential race condition), trying again...');
          numTries += 1;
        } else {
          throw e;
        }

        if (numTries > 10) {
          throw e;
        }
      }
    }
  }

  async submitWork() {
    const result = await Promise.all([
      this.createWorker(),
      this.getQueueAndHandleMessage(),
    ]);

    const podInfo = result[0];

    AWSXRay.getSegment().addAnnotation('result', 'success-worker');
    return podInfo;
  }
}

module.exports = WorkSubmitService;
