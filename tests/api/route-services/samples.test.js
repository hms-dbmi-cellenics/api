const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const SamplesService = require('../../../src/api/route-services/samples');

describe('tests for the samples service', () => {
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
    return getItemSpy;
  };

  it('Get samples works', async (done) => {
    const jsData = {
      samples: {
        ids: ['sample-1'],
        'sample-1': {
          name: 'sample-1',
        },
      },
    };

    const getItemSpy = mockDynamoGetItem(jsData);

    (new SamplesService()).getSamples('12345')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'samples-test',
          Key: { experimentId: { S: '12345' } },
          ProjectionExpression: 'samples',
        });
      })
      .then(() => done());
  });

  it('Get sampleIds works', async (done) => {
    const jsData = {
      samples: {
        ids: ['sample-1', 'sample-2'],
      },
    };

    const getItemSpy = mockDynamoGetItem(jsData);

    (new SamplesService()).getSampleIds('12345')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'samples-test',
          Key: { experimentId: { S: '12345' } },
          ProjectionExpression: 'samples.ids',
        });
      })
      .then(() => done());
  });
});
