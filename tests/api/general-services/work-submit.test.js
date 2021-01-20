const AWS = require('aws-sdk');
const AWSMock = require('aws-sdk-mock');
const WorkSubmitService = require('../../../src/api/general-services/work-submit');

jest.mock('@kubernetes/client-node');

describe('tests for the work-submit service', () => {
  it('Can submit work', async (done) => {
    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', config: { type: 'pca' } },
    };

    AWSMock.setSDKInstance(AWS);
    const sendMessageSpy = jest.fn((x) => x);
    AWSMock.mock('SQS', 'sendMessage', (params) => {
      sendMessageSpy(params);
      return new Promise((resolve) => {
        resolve(sendMessageSpy);
      });
    });

    const w = new WorkSubmitService(workRequest);
    w.submitWork().then(() => {
      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
      expect(sendMessageSpy).toHaveBeenCalledWith(
        {
          MessageBody: JSON.stringify(workRequest),
          QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/test-account-id/queue-job-c55f9dd848349af0832dce12345f72ca743fb713-test.fifo',
          MessageGroupId: 'work',
        },
      );
      return done();
    }).catch((e) => {
      throw new Error(e);
    });
  });

  afterEach(() => {
    AWSMock.restore('SQS');
    jest.resetModules();
    jest.restoreAllMocks();
  });
});
