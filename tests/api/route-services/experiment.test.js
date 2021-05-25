const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const ExperimentService = require('../../../src/api/route-services/experiment');
const {
  mockDynamoGetItem,
  mockDynamoUpdateItem,
  mockS3GetObject,
  mockS3PutObject,
  mockDynamoBatchGetItem,
} = require('../../test-utils/mockAWSServices');

jest.setTimeout(30000);

describe('tests for the experiment service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });


  it('Get experiment data works', async (done) => {
    const jsData = {
      experimentId: '12345',
      experimentName: 'TGFB1 experiment',

    };

    const fnSpy = mockDynamoGetItem(jsData);

    (new ExperimentService()).getExperimentData('12345')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(fnSpy).toHaveBeenCalledWith({
          TableName: 'experiments-test',
          Key: { experimentId: { S: '12345' } },
          ProjectionExpression: 'projectId,meta,experimentId,experimentName',
        });
      })
      .then(() => done());
  });

  it('Get list of experiments work', async (done) => {
    const experimentIds = ['experiment-1', 'experiment-2', 'experiment-3'];

    const response = {
      Responses: {
        'experiments-test': experimentIds.map((experimentId) => AWS.DynamoDB.Converter.marshall({ experimentId })),
      },
    };

    const fnSpy = mockDynamoBatchGetItem(response);

    (new ExperimentService()).getListOfExperiments(experimentIds)
      .then((data) => {
        expect(data).toEqual(experimentIds.map((experimentId) => ({ experimentId })));
        expect(fnSpy).toHaveBeenCalledWith(
          {
            RequestItems: {
              'experiments-test': {
                Keys: experimentIds.map(
                  (experimentId) => AWS.DynamoDB.Converter.marshall({ experimentId }),
                ),
              },
            },
          },
        );
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

    (new ExperimentService()).getPipelineHandle('qc', '12345')
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

    (new ExperimentService()).saveQCHandle('12345', jsTestData)
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

  it('Set gem2s Handle works', async (done) => {
    const jsTestData = {
      stateMachineArn: 'STATE-MACHINE-ID',
      executionArn: 'EXECUTION-ID',
    };

    const updateItemSpy = mockDynamoUpdateItem();
    const dynamoTestData = AWS.DynamoDB.Converter.marshall({ ':x': jsTestData });

    (new ExperimentService()).saveGem2sHandle('12345', jsTestData)
      .then(() => {
        expect(updateItemSpy).toHaveBeenCalledWith(
          {
            TableName: 'experiments-test',
            Key: { experimentId: { S: '12345' } },
            UpdateExpression: 'set meta.gem2s = :x',
            ExpressionAttributeValues: dynamoTestData,
          },
        );
      })
      .then(() => done());
  });
});
