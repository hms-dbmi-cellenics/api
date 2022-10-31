// Placed here based on https://stackoverflow.com/a/73188692
const mockValidate = jest.fn();

const https = require('https');

const config = require('../../src/config');
const parseSNSMessage = require('../../src/utils/parseSNSMessage');

jest.mock('https');
jest.mock('sns-validator', () => jest.fn().mockImplementation(() => ({
  validate: mockValidate,
})));

jest.mock('../../src/utils/getLogger');

const experimentId = 'mockExperimentId';
const expectedTopicName = 'expectedTopicName';
const expectedTopicArn = `arn:aws:sns:${config.awsRegion}:${config.awsAccountId}:${expectedTopicName}-${config.clusterEnv}-${config.sandboxId}-v2`;

const createMockValidatedMessage = (Type, Message) => ({
  MessageId: 'mockMessageId',
  Message,
  Type,
  SubscribeURL: 'http://mockUrl.com',
});

describe('parseSNSMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('Handles SubscriptionConfirmation messages correctly', async () => {
    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization', 'x-amz-sns-topic-arn': expectedTopicArn },
      body: JSON.stringify({ paramsHash: 'mockParamsHash' }),
    };

    const mockMsg = 'mockMsg';
    const mockValidatedMessage = createMockValidatedMessage('SubscriptionConfirmation', mockMsg);

    mockValidate.mockImplementation((params, cb) => { cb(null, mockValidatedMessage); });
    https.get.mockImplementation(() => Promise.resolve());

    const res = await parseSNSMessage(mockReq, expectedTopicArn);

    expect(https.get).toHaveBeenCalledWith(mockValidatedMessage.SubscribeURL);

    expect(res).toEqual({ msg: mockValidatedMessage });
  });

  it('Handles UnsubscribeConfirmation messages correctly', async () => {
    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization', 'x-amz-sns-topic-arn': expectedTopicArn },
      body: JSON.stringify({ paramsHash: 'mockParamsHash' }),
    };

    const mockMsg = 'mockMsg';
    const mockValidatedMessage = createMockValidatedMessage('UnsubscribeConfirmation', mockMsg);

    mockValidate.mockImplementation((params, cb) => { cb(null, mockValidatedMessage); });
    https.get.mockImplementation(() => Promise.resolve());

    const res = await parseSNSMessage(mockReq, expectedTopicArn);

    expect(https.get).toHaveBeenCalledWith(mockValidatedMessage.SubscribeURL);

    expect(res).toEqual({ msg: mockValidatedMessage });
  });

  it('Handles Notification messages correctly', async () => {
    const mockIo = 'mockIo';
    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization', 'x-amz-sns-topic-arn': expectedTopicArn },
      body: JSON.stringify({ paramsHash: 'mockParamsHash' }),
      app: { get: jest.fn(() => mockIo) },
    };

    const mockMsg = '{"name": "hi", "description": "hello"}';
    const mockValidatedMessage = createMockValidatedMessage('Notification', mockMsg);
    mockValidate.mockImplementation((params, cb) => { cb(null, mockValidatedMessage); });

    const res = await parseSNSMessage(mockReq, expectedTopicArn);

    expect(res).toEqual(
      { io: mockIo, parsedMessage: JSON.parse(mockMsg), msg: mockValidatedMessage },
    );
    expect(mockReq.app.get).toHaveBeenCalledWith('io');
  });
});
