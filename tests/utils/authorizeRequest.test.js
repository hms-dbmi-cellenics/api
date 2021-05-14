const AWSMock = require('aws-sdk-mock');
const authorizeRequest = require('../../src/utils/authorizeRequest');

const {
  mockDynamoGetItem,
} = require('../test-utils/mockAWSServices');

describe('Tests for authorizing api requests ', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });
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
