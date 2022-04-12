const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../../src/utils/requireAWS');
const WorkSubmitService = require('../../../../src/api.v2/helpers/pipeline/workSubmit');

jest.mock('@kubernetes/client-node');

describe('workSubmit', () => {
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
          QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/test-account-id/queue-job-1cd932135df1889ebf59575eb8fbe4b6c29858ee-test.fifo',
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
