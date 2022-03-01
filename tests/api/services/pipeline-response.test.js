const AWSMock = require('aws-sdk-mock');
const io = require('socket.io-client');

const validateRequest = require('../../../src/utils/validateRequest');
const PipelineService = require('../../../src/api/services/pipelines/PipelineService');
const pipelineAssign = require('../../../src/utils/hooks/assignPodToPipeline');
const { buildPodRequest } = require('../../../src/api/services/pipelines/manage/constructors/buildPodRequest');
const constants = require('../../../src/api/services/pipelines/manage/pipelineConstants');
const { SUCCEEDED } = require('../../../src/api/services/pipelines/manage/pipelineConstants');
const fake = require('../../test-utils/constants');
const getPipelineStatus = require('../../../src/api/services/pipelines/pipelineStatus');

jest.mock('../../../src/api/services/pipeline-status');
jest.mock('../../../src/utils/authMiddlewares');


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

  beforeEach(() => {
    mockSocket = io(fake.SOCKET_ENDPOINT);
    mockIO = { sockets: mockSocket };
    getPipelineStatus.mockImplementationOnce(() => ({
      qc: {
        status: SUCCEEDED,
      },
    }));
  });

  afterEach(() => {
    AWSMock.restore();
    // restore mock counts to avoid interferences among tests
    jest.clearAllMocks();
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

    expect(pipelineAssign.assignPodToPipeline).toHaveBeenCalledTimes(1);

    expect(pipelineAssign.assignPodToPipeline).toHaveBeenCalledWith(message);
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith(`ExperimentUpdates-${fake.EXPERIMENT_ID}`,
      expect.objectContaining({
        type: constants.QC_PROCESS_NAME,
        experimentId: fake.EXPERIMENT_ID,
        taskName: constants.ASSIGN_POD_TO_PIPELINE,
      }));
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
      experimentId: fake.EXPERIMENT_ID,
      input: {
        experimentId: fake.EXPERIMENT_ID,
        taskName: 'classifier',
        processName: constants.QC_PROCESS_NAME,
        config: {
          auto: true,
          filterSettings: {
            FDR: 0.01,
          },
          enabled: false,
          defaultFilterSettings: {
            FDR: 0.01,
          },
        },
        uploadCountMatrix: false,
        authJWT: 'fakeBearer',
        sampleUuid: fake.SAMPLE_UUID,
      },
      output: {
        bucket: fake.S3_BUCKET,
        key: fake.S3_KEY,
      },
      response: {
        error: false,
      },
    };

    await PipelineService.qcResponse(mockIO, message);

    expect(s3Spy).toHaveBeenCalledTimes(1);
    expect(dynamoDbSpy).toMatchSnapshot();
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith(`ExperimentUpdates-${fake.EXPERIMENT_ID}`,
      expect.objectContaining({
        type: constants.QC_PROCESS_NAME,
        experimentId: fake.EXPERIMENT_ID,
      }));
  });

  it('sends updates when there are errors in the message', async () => {
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

      response: { error: true },
      experimentId: fake.EXPERIMENT_ID,
    };

    await PipelineService.qcResponse(mockIO, message);

    // Download output from S3
    expect(s3Spy).not.toHaveBeenCalled();
    expect(dynamoDbSpy).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith(`ExperimentUpdates-${fake.EXPERIMENT_ID}`,
      expect.objectContaining({
        type: constants.QC_PROCESS_NAME,
        experimentId: fake.EXPERIMENT_ID,
        response: { error: true },
      }));
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

    await validateRequest(s3output, 'ProcessingConfigBodies.v1.yaml');
    // TODO reenable this part of the test when schema validation is uncommented
    // try {
    //   await PipelineService.qcResponse(mockIO, message);
    // } catch (e) {
    //   expect(e.message).toMatch(
    //     /^Error: config is not a valid target for anyOf/,
    //   );
    // }

    // // Download output from S3
    // expect(s3Spy).toHaveBeenCalledTimes(1);
    // // Update processing settings in dynamoDB
    // expect(dynamoDbSpy).not.toHaveBeenCalledTimes(1);
    // expect(mockSocket.emit).not.toHaveBeenCalled();
  });
});
