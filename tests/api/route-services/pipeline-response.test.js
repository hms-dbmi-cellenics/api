const AWSMock = require('aws-sdk-mock');
const ioClient = require('socket.io-client');
const ioServer = require('socket.io')({
  allowEIO3: true,
});
const AWS = require('../../../src/utils/requireAWS');
const pipelineResponse = require('../../../src/api/route-services/pipeline-response');

jest.mock('../../../src/api/general-services/pipeline-status', () => jest.fn().mockImplementation(() => ({
  pipelineStatus: () => ({}),
})));

const {
  mockDynamoGetItem, mockS3GetObject, mockDynamoUpdateItem,
} = require('../../test-utils/mockAWSServices');

describe('Test Pipeline Response Service', () => {
  let io;
  let client;

  const message = {
    input: {
      experimentId: '1234',
      taskName: 'cellSizeDistribution',
      sampleUuid: 'sampleId',
    },
    output: {
      bucket: 'aws-bucket',
      key: '1234',
    },
    response: { error: false },
    experimentId: '1234',
  };

  const s3output = {
    Body: JSON.stringify(
      {
        config: {
          enabled: true,
          filterSettings: {
            minCellSize: 10800,
            binStep: 200,
          },
        },
      },
    ),
  };

  const experimentId = '1234';

  beforeAll(() => {
    io = ioServer.listen(3001);
  });

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    client = ioClient.connect('http://localhost:3001', {
      'reconnection delay': 0,
      'reopen delay': 0,
      'force new connection': true,
      transports: ['websocket'],
    });
  });

  afterEach(() => {
    AWSMock.restore();

    if (client.connected) {
      client.disconnect();
    }
  });

  afterAll(() => {
    io.close();
  });

  it('functions propely with correct input (no sample UUID given)', async () => {
    AWSMock.setSDKInstance(AWS);

    const s3Spy = mockS3GetObject(s3output);
    const dynamoDbSpy = mockDynamoUpdateItem();

    mockDynamoGetItem({
      processingConfig: {
        cellSizeDistribution: {
          sampleId: {
            auto: true,
            filterSettings: { binStep: 200, minCellSize: 420 },
            defaultFilterSettings: { binStep: 200, minCellSize: 420 },
          },
          enabled: true,
        },
      },
    });

    // Expect websocket event
    client.on(`ExperimentUpdates-${experimentId}`, (res) => {
      expect(res).toEqual(message);
    });

    await pipelineResponse(io, message);

    // Download output from S3
    expect(s3Spy).toHaveBeenCalled();

    // Update processing settings in dynamoDB
    expect(dynamoDbSpy).toMatchSnapshot();
  });

  it('functions propely with correct input (custom sample UUID given)', async () => {
    AWSMock.setSDKInstance(AWS);

    const s3Spy = mockS3GetObject(s3output);
    const dynamoDbSpy = mockDynamoUpdateItem();

    mockDynamoGetItem({
      processingConfig: {
        cellSizeDistribution: {
          control: {
            auto: true,
            filterSettings: { binStep: 200, minCellSize: 420 },
            defaultFilterSettings: { binStep: 200, minCellSize: 420 },
          },
          enabled: true,
        },
      },
    });

    // Expect websocket event
    client.on(`ExperimentUpdates-${experimentId}`, (res) => {
      expect(res).toEqual(message);
    });

    await pipelineResponse(io, { ...message, input: { ...message.input, sampleUuid: 'control' } });

    // Download output from S3
    expect(s3Spy).toHaveBeenCalled();

    // Update processing settings in dynamoDB
    expect(dynamoDbSpy).toMatchSnapshot();
  });

  it('throws error on receiving error in message', async () => {
    const errorMessage = message;
    errorMessage.response.error = true;

    AWSMock.setSDKInstance(AWS);

    const s3Spy = mockS3GetObject(s3output);
    const dynamoDbSpy = mockDynamoUpdateItem();

    // Expect websocket event
    client.on(`ExperimentUpdates-${experimentId}`, (res) => {
      expect(res).toEqual(errorMessage);
    });

    await pipelineResponse(io, errorMessage);

    expect(s3Spy).not.toHaveBeenCalled();
    expect(dynamoDbSpy).not.toHaveBeenCalled();
  });
});
