const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');
const { OK } = require('../../../src/utils/responses');

const SamplesService = require('../../../src/api/route-services/samples');
const {
  mockDynamoGetItem,
  mockDynamoQuery,
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
  mockS3DeleteObjects,
} = require('../../test-utils/mockAWSServices');

describe('tests for the samples service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  it('Get samples by projectUuid works', async () => {
    const jsData = {
      samples: {
        'sample-1': {
          name: 'sample-1',
        },
      },
    };

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':projectUuid': 'project-1',
    });

    const fnSpy = mockDynamoQuery(jsData);

    const res = await (new SamplesService()).getSamples('project-1');

    expect(res[0]).toEqual(jsData);

    expect(fnSpy).toHaveBeenCalledWith({
      TableName: 'samples-test',
      IndexName: 'gsiByProjectAndExperimentID',
      KeyConditionExpression: 'projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    });
  });

  it('Get sample by experimentId works', async () => {
    const jsData = {
      samples: {
        'sample-1': { name: 'sample-1' },
        'sample-2': { name: 'sample-2' },
      },
    };

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      experimentId: 'project-1',
    });

    const getItemSpy = mockDynamoGetItem(jsData);

    const res = await (new SamplesService()).getSamplesByExperimentId('project-1');

    expect(res).toEqual(jsData);
    expect(getItemSpy).toHaveBeenCalledWith({
      TableName: 'samples-test',
      Key: marshalledKey,
      ProjectionExpression: 'samples',
    });
  });

  it('updateSamples work', async () => {
    const jsData = {
      projectUuid: 'project-1',
      experimentId: 'experiment-1',
      samples: {
        'sample-1': { name: 'sample-1' },
        'sample-2': { name: 'sample-2' },
      },
    };

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      experimentId: 'experiment-1',
    });

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':samples': jsData.samples,
      ':projectUuid': jsData.projectUuid,
    });

    const getItemSpy = mockDynamoUpdateItem(jsData);

    const res = await (new SamplesService()).updateSamples('project-1', jsData);

    expect(res).toEqual(OK());

    expect(getItemSpy).toHaveBeenCalledWith({
      TableName: 'samples-test',
      Key: marshalledKey,
      UpdateExpression: 'SET samples = :samples, projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    });
  });

  it('delete sample works', async () => {
    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      experimentId: 'experiment-1',
    });

    const deleteDynamoFnSpy = mockDynamoDeleteItem();

    mockDynamoGetItem({
      samples: {
        'sampleUuid-1': {
          files: {
            'barcodes.tsv.gz': {},
            'features.tsv.gz': {},
            'matrix.mtx.gz': {},
          },
        },
      },
    });

    const deleteS3FnSpy = mockS3DeleteObjects({ Errors: [] });

    const s3DeleteParams = {
      Bucket: 'biomage-originals-test',
      Delete: {
        Objects: [
          { Key: 'project-1/sampleUuid-1/barcodes.tsv.gz' },
          { Key: 'project-1/sampleUuid-1/features.tsv.gz' },
          { Key: 'project-1/sampleUuid-1/matrix.mtx.gz' },
        ],
        Quiet: false,
      },
    };

    const res = await (new SamplesService()).deleteSamplesEntry('project-1', 'experiment-1', ['sampleUuid-1'], {});

    expect(res).toEqual(OK());
    expect(deleteDynamoFnSpy).toHaveBeenCalledWith({
      TableName: 'samples-test',
      Key: marshalledKey,
    });
    expect(deleteS3FnSpy).toHaveBeenCalledWith(s3DeleteParams);
  });

  it('addSample works', async () => {
    const mockSampleToAdd = {
      name: 'WT1',
      projectUuid: 'projectUuid',
      uuid: 'sampleUuid',
      type: '10X Chromium',
      species: null,
      createdDate: '4242-42-42T18:58:49.131Z',
      lastModified: '4242-42-42T18:58:49.131Z',
      complete: false,
      error: false,
      fileNames: [],
      files: {},
      metadata: {},
    };

    const updateItemSpy = mockDynamoUpdateItem({});

    const res = await (new SamplesService()).addSample('projectUuid', 'experimentId', mockSampleToAdd);

    expect(res).toEqual(OK());

    expect(updateItemSpy.mock.calls[0]).toMatchSnapshot();
    expect(updateItemSpy.mock.calls[1]).toMatchSnapshot();

    // Only these two calls to dynamo were made
    expect(updateItemSpy.mock.calls).toHaveLength(2);
  });
});
