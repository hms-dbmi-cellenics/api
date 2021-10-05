const AWSMock = require('aws-sdk-mock');
const io = require('socket.io-client');

const AWS = require('../../../src/utils/requireAWS');
const PipelineService = require('../../../src/api/route-services/pipeline-response');
const pipelineAssign = require('../../../src/utils/hooks/pipeline-assign');
const { buildPodRequest } = require('../../../src/api/general-services/pipeline-manage/constructors/assign-pod-to-pipeline');
const constants = require('../../../src/api/general-services/pipeline-manage/constants');
const fake = require('../../test-utils/constants');

jest.mock('../../../src/api/general-services/pipeline-status', () => jest.fn().mockImplementation(() => ({
  pipelineStatus: () => ({}),
})));


jest.mock('../../../src/utils/hooks/pipeline-assign', () => {
  const originalModule = jest.requireActual('../../../src/utils/hooks/pipeline-assign');

  return {
    ...originalModule,
    assignPodToPipeline: jest.fn(),
  };
});

jest.mock('socket.io-client', () => {
  const mSocket = {
    emit: jest.fn(),
  };
  return jest.fn(() => mSocket);
});

const {
  mockDynamoGetItem, mockS3GetObject, mockDynamoUpdateItem,
} = require('../../test-utils/mockAWSServices');


describe('Test Pipeline Response Service', () => {
  let mockSocket;
  let mockIO;

  // const s3output = {
  //   Body: JSON.stringify(fake.S3_WORKER_RESULT),
  // };


  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    const ENDPOINT = 'localhost:5000';
    mockSocket = io(ENDPOINT);
    mockIO = { sockets: mockSocket };
  });

  afterEach(() => {
    AWSMock.restore();
  });

  afterAll(() => {
    io.close();
  });


  it('calls assign pod functions with valid input message', async () => {
    const message = buildPodRequest(fake.SANDBOX_ID,
      fake.EXPERIMENT_ID,
      constants.ASSIGN_POD_TO_PIPELINE,
      constants.GEM2S_PROCESS_NAME,
      fake.ACTIVITY_ID);

    await PipelineService.qcResponse(mockIO, message);

    expect(pipelineAssign.assignPodToPipeline).toHaveBeenCalled();

    // The first arg of the first call to the function was the passed message.
    expect(pipelineAssign.assignPodToPipeline.mock.calls[0][0]).toBe(message);
    expect(mockSocket.emit).toHaveBeenCalled();
  });


  it('updates processing config when output contains a valid config', async () => {
    const s3output = {
      Body: JSON.stringify(fake.S3_WORKER_RESULT),
    };
    const s3Spy = mockS3GetObject(s3output);
    const dynamoDbSpy = mockDynamoUpdateItem();

    mockDynamoGetItem({
      processingConfig: fake.CELL_SIZE_PROCESSING_CONFIG,
    });

    const message = {
      input: {
        experimentId: fake.EXPERIMENT_ID,
        taskName: 'cellSizeDistribution',
        sampleUuid: fake.SAMPLE_UUID,
      },
      output: {
        bucket: fake.S3_BUCKET,
        key: fake.S3_KEY,
      },

      response: { error: false },
      experimentId: fake.EXPERIMENT_ID,
    };

    await PipelineService.qcResponse(mockIO, message);

    // Download output from S3
    expect(s3Spy).toHaveBeenCalled();
    // Update processing settings in dynamoDB
    expect(dynamoDbSpy).toMatchSnapshot();
    expect(mockSocket.emit).toHaveBeenCalled();
  });

  it('fails when output config is not valid', async () => {
    // missing required "filterSettings"
    const s3output = {
      Body: JSON.stringify({
        config: {
          auto: true,
        },
      }),
    };
    const s3Spy = mockS3GetObject(s3output);
    const dynamoDbSpy = mockDynamoUpdateItem();

    mockDynamoGetItem({
      processingConfig: fake.CELL_SIZE_PROCESSING_CONFIG,
    });

    const message = {
      input: {
        experimentId: fake.EXPERIMENT_ID,
        taskName: 'cellSizeDistribution',
        sampleUuid: fake.SAMPLE_UUID,
      },
      output: {
        bucket: fake.S3_BUCKET,
        key: fake.S3_KEY,
      },

      response: { error: false },
      experimentId: fake.EXPERIMENT_ID,
    };

    await PipelineService.qcResponse(mockIO, message);

    // Download output from S3
    expect(s3Spy).toHaveBeenCalled();
    // Update processing settings in dynamoDB
    expect(dynamoDbSpy).toMatchSnapshot();
    expect(mockSocket.emit).toHaveBeenCalled();
  });

  // it('functions properly with correct input (custom sample UUID given)', async () => {
  //   AWSMock.setSDKInstance(AWS);

  //   const s3Spy = mockS3GetObject(s3output);
  //   const dynamoDbSpy = mockDynamoUpdateItem();

  //   mockDynamoGetItem({
  //     processingConfig: {
  //       cellSizeDistribution: {
  //         control: {
  //           auto: true,
  //           filterSettings: { binStep: 200, minCellSize: 420 },
  //           defaultFilterSettings: { binStep: 200, minCellSize: 420 },
  //         },
  //         enabled: true,
  //       },
  //     },
  //   });

  //   // Expect websocket event
  //   client.on(`ExperimentUpdates-${fake.EXPERIMENT_ID}`, (res) => {
  //     expect(res).toEqual(message);
  //   });

  //   await PipelineService.qcResponse(io, { ...message, input: { ...message.input, sampleUuid: 'control' } });

  //   // Download output from S3
  //   expect(s3Spy).toHaveBeenCalled();

  //   // Update processing settings in dynamoDB
  //   expect(dynamoDbSpy).toMatchSnapshot();
  // });

  // it('throws error on receiving error in message', async () => {
  //   const errorMessage = message;
  //   errorMessage.response.error = true;

  //   AWSMock.setSDKInstance(AWS);

  //   const s3Spy = mockS3GetObject(s3output);
  //   const dynamoDbSpy = mockDynamoUpdateItem();

  //   // Expect websocket event
  //   client.on(`ExperimentUpdates-${fake.EXPERIMENT_ID}`, (res) => {
  //     expect(res).toEqual(errorMessage);
  //   });

  //   await PipelineService.qcResponse(io, errorMessage);

  //   expect(s3Spy).not.toHaveBeenCalled();
  //   expect(dynamoDbSpy).not.toHaveBeenCalled();
  // });
});
