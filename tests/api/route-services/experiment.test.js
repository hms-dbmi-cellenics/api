const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const ExperimentService = require('../../../src/api/route-services/experiment');

describe('tests for the experiment service', () => {
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

  const mockDynamoUpdateItem = () => {
    const updateItemSpy = jest.fn((x) => x);
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'updateItem', (params, callback) => {
      updateItemSpy(params);
      callback(null, {}); // We do not care about the return value here, it is not used.
    });
    return updateItemSpy;
  };

  const mockS3GetObject = (jsData) => {
    const getObjectSpy = jest.fn((x) => x);
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('S3', 'getObject', (params, callback) => {
      getObjectSpy(params);
      callback(null, jsData);
    });

    return getObjectSpy;
  };

  const mockS3PutObject = () => {
    const putObjectSpy = jest.fn((x) => x);
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('S3', 'putObject', (params, callback) => {
      putObjectSpy(params);

      callback(null, {});
    });

    return putObjectSpy;
  };


  it('Get experiment data works', async (done) => {
    const jsData = {
      experimentId: '12345',
      experimentName: 'TGFB1 experiment',
    };

    const getItemSpy = mockDynamoGetItem(jsData);

    (new ExperimentService()).getExperimentData('12345')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'experiments-test',
          Key: { experimentId: { S: '12345' } },
          ProjectionExpression: 'experimentId,experimentName',
        });
      })
      .then(() => done());
  });

  it('Get cell sets works', async (done) => {
    const jsData = {
      cellSets: [
        { key: 1, name: 'set 1', color: '#008DA6' },
        { key: 2, name: 'set 2', color: '#008D56' },
        { key: 3, name: 'set 3', rootNode: true },
      ],
    };

    const strData = JSON.stringify(jsData);

    const getObjectSpy = mockS3GetObject({ Body: strData });

    (new ExperimentService()).getCellSets('12345')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getObjectSpy).toHaveBeenCalledWith(
          {
            Bucket: 'cell-sets-test',
            Key: '12345',
          },
        );
      })
      .then(() => done());
  });

  it('Update experiment cell sets works', async (done) => {
    const testDataToPut = 'testDataToPutString';

    const putObjectSpy = mockS3PutObject();

    (new ExperimentService()).updateCellSets('12345', testDataToPut)
      .then((returnValue) => {
        expect(returnValue).toEqual(testDataToPut);
        expect(putObjectSpy).toHaveBeenCalledWith(
          {
            Bucket: 'cell-sets-test',
            Key: '12345',
            Body: JSON.stringify({ cellSets: testDataToPut }),
          },
        );
      })
      .then(() => done());
  });

  it('Get processing config works', async (done) => {
    const jsData = {
      processing: {
        cellSizeDistribution: {
          enabled: true,
          filterSettings: {
            minCellSize: 10800,
            binStep: 200,
          },
        },
        classifier: {
          enabled: true,
          filterSettings: {
            minProbabiliy: 0.8,
            filterThreshold: -1,
          },
        },
      },
    };

    const getItemSpy = mockDynamoGetItem(jsData);

    (new ExperimentService()).getProcessingConfig('12345')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getItemSpy).toHaveBeenCalledWith(
          {
            TableName: 'experiments-test',
            Key: { experimentId: { S: '12345' } },
            ProjectionExpression: 'processingConfig',
          },
        );
      })
      .then(() => done());
  });

  it('Update processing config works', async (done) => {
    const testData = [
      {
        name: 'classifier',
        body: {
          enabled: false,
          filterSettings: {
            minProbabiliy: 0.5,
            filterThreshold: 1,
          },
        },
      },
    ];

    const updateItemSpy = mockDynamoUpdateItem();

    (new ExperimentService()).updateProcessingConfig('12345', testData)
      .then(() => {
        expect(updateItemSpy).toHaveBeenCalledWith(
          {
            TableName: 'experiments-test',
            Key: { experimentId: { S: '12345' } },
            ReturnValues: 'UPDATED_NEW',
            UpdateExpression: 'SET processingConfig.#key1 = :val1',
            ExpressionAttributeNames: {
              '#key1': 'classifier',
            },
            ExpressionAttributeValues: {
              ':val1': {
                M: {
                  enabled: { BOOL: false },
                  filterSettings: {
                    M: {
                      minProbabiliy: { N: '0.5' },
                      filterThreshold: { N: '1' },
                    },
                  },
                },
              },
            },
          },
        );
      })
      .then(() => done());
  });

  it('Get Pipeline Handle works', async (done) => {
    const handle = {
      stateMachineArn: 'STATE-MACHINE-ID',
      executionArn: '',
    };

    const jsData = {
      meta: {
        pipeline: {
          stateMachineArn: handle.stateMachineArn,
        },
        organism: 'mmusculus',
        type: '10x',
      },
    };

    const getItemSpy = mockDynamoGetItem(jsData);

    (new ExperimentService()).getPipelineHandle('12345')
      .then((data) => {
        expect(data).toEqual(handle);
        expect(getItemSpy).toHaveBeenCalledWith(
          {
            TableName: 'experiments-test',
            Key: { experimentId: { S: '12345' } },
            ProjectionExpression: 'meta',
          },
        );
      })
      .then(() => done());
  });

  it('Set Pipeline Handle works', async (done) => {
    const jsTestData = {
      stateMachineArn: 'STATE-MACHINE-ID',
      executionArn: 'EXECUTION-ID',
    };

    const updateItemSpy = mockDynamoUpdateItem();
    const dynamoTestData = AWS.DynamoDB.Converter.marshall({ ':x': jsTestData });

    (new ExperimentService()).savePipelineHandle('12345', jsTestData)
      .then(() => {
        expect(updateItemSpy).toHaveBeenCalledWith(
          {
            TableName: 'experiments-test',
            Key: { experimentId: { S: '12345' } },
            UpdateExpression: 'set meta.pipeline = :x',
            ExpressionAttributeValues: dynamoTestData,
          },
        );
      })
      .then(() => done());
  });
});
