// Placed here based on https://stackoverflow.com/a/73188692
const mockValidate = jest.fn();

const config = require('../../src/config');
const parseSNSMessage = require('../../src/utils/parseSNSMessage');
// const https = require('https');
// const { promisify } = require('util');
// const getLogger = require('./getLogger');
// const { UnauthorizedError } = require('./responses');

jest.mock('../../src/utils/getLogger');
jest.mock('sns-validator', () => jest.fn().mockImplementation(() => ({
  validate: mockValidate,
})));

const experimentId = 'mockExperimentId';
const expectedTopicName = 'expectedTopicName';
const expectedTopicArn = `arn:aws:sns:${config.awsRegion}:${config.awsAccountId}:${expectedTopicName}-${config.clusterEnv}-${config.sandboxId}-v2`;

describe('parseSNSMessage', () => {
  beforeEach(() => {

  });

  it('Fails if expected topic doesnt match', async () => {
    const receivedTopicArn = `arn:aws:sns:${config.awsRegion}:${config.awsAccountId}:wrongTopic-${config.clusterEnv}-${config.sandboxId}-v2`;

    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization', 'x-amz-sns-topic-arn': receivedTopicArn },
      body: JSON.stringify({ paramsHash: 'mockParamsHash' }),
    };

    await expect(parseSNSMessage(mockReq, expectedTopicArn)).rejects.toThrow(new Error('SNS topic doesn\'t match'));
  });

  it('Fails if request body parsing doesnt work', async () => {
    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization', 'x-amz-sns-topic-arn': expectedTopicArn },
      body: '{ paramsHash: /invalid/ }',
    };

    await expect(parseSNSMessage(mockReq, expectedTopicArn)).rejects.toThrow(new Error('Unexpected token p in JSON at position 2'));
  });

  it('Fails if request body parsing doesnt work', async () => {
    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization', 'x-amz-sns-topic-arn': expectedTopicArn },
      body: JSON.stringify({ paramsHash: 'mockParamsHash' }),
    };

    mockValidate.mockImplementation(() => { throw new Error('Validation error'); });

    await expect(parseSNSMessage(mockReq, expectedTopicArn)).rejects.toThrow(new Error('Validation error'));
  });
});
