const AWSMock = require('aws-sdk-mock');
const AWS = require('../../src/utils/requireAWS');
const authorizeRequest = require('../../src/utils/authorizeRequest');

describe('Tests for authorizing api requests ', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });
  const mockDynamoGetItem = (jsData) => {
    const dynamodbData = {
      Item: AWS.DynamoDB.Converter.marshall(jsData),
    };
    const getItemSpy = jest.fn((x) => x);
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      getItemSpy(params);
      callback(null, dynamodbData);
    });
  };
  const data = {
    experimentId: '12345',
    can_write: ['admin'],
  };
  it('Authorized user can proceed', async () => {
    mockDynamoGetItem(data);
    const result = await authorizeRequest('12345', 'admin');
    expect(result).toEqual(true);
  });

  it('Unauthorized user cannot proceed', async () => {
    mockDynamoGetItem(data);
    const result = await authorizeRequest('12345', 'randomUser');
    expect(result).toEqual(false);
  });
});
