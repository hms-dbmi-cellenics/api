// @ts-nocheck
const _ = require('lodash');
const io = require('socket.io-client');
const AWSMock = require('aws-sdk-mock');

const handleQCResponse = require('../../../../src/api.v2/helpers/pipeline/handleQCResponse');
const constants = require('../../../../src/api.v2/constants');

const { mockS3GetObject } = require('../../../test-utils/mockAWSServices');
const fake = require('../../../test-utils/constants');

const Experiment = require('../../../../src/api.v2/model/Experiment');
const getPipelineStatus = require('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
const { buildPodRequest } = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/constructors/requestAssignPodToPipeline');

const HookRunner = require('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');
const podCleanup = require('../../../../src/api.v2/helpers/pipeline/hooks/podCleanup');
const sendNotification = require('../../../../src/api.v2/helpers/pipeline/hooks/sendNotification');
const updatePipelineVersion = require('../../../../src/api.v2/helpers/pipeline/hooks/updatePipelineVersion');
const assignPodToPipeline = require('../../../../src/api.v2/helpers/pipeline/hooks/assignPodToPipeline');

const validateRequest = require('../../../../src/utils/schema-validator');

jest.mock('aws-xray-sdk');

jest.mock('socket.io-client', () => {
  const mSocket = {
    emit: jest.fn(),
  };
  return jest.fn(() => mSocket);
});

jest.mock('../../../../src/api.v2/model/Experiment');
jest.mock('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/assignPodToPipeline');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/podCleanup');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/updatePipelineVersion');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/sendNotification');

jest.mock('../../../../src/utils/schema-validator');

const hookRunnerInstance = HookRunner();

describe('handleQCResponse module', () => {
  describe('Registered hooks', () => {
    beforeEach(() => {
      assignPodToPipeline.mockClear();
      podCleanup.cleanupPods.mockClear();
      sendNotification.mockClear();
    });

    it('Hooks are registered', () => {
      expect(_.map(hookRunnerInstance.register.mock.calls, _.head)).toEqual(['assignPodToPipeline', 'configureEmbedding']);
    });

    it('assignPodToPipeline hook works correctly', () => {
      const assignPodToPipelineHooks = hookRunnerInstance.register.mock.calls[0][1];
      const mockedMessage = { mock: true };

      expect(assignPodToPipelineHooks).toHaveLength(1);

      assignPodToPipelineHooks[0](mockedMessage);

      expect(assignPodToPipeline).toHaveBeenCalledWith(mockedMessage);
    });

    it('configureEmbedding hook works correctly', () => {
      const configureEmbeddingHooks = hookRunnerInstance.register.mock.calls[1][1];
      const mockedMessage = { mock: true };

      configureEmbeddingHooks[0](mockedMessage);
      expect(podCleanup.cleanupPods).toHaveBeenCalledWith(mockedMessage);

      configureEmbeddingHooks[1](mockedMessage);
      expect(updatePipelineVersion).toHaveBeenCalledWith(mockedMessage);
    });

    it('registerAll hook works correctly', () => {
      const sendNotificationHooks = hookRunnerInstance.registerAll.mock.calls[0][0];
      const mockedMessage = { mock: true };

      sendNotificationHooks[0](mockedMessage);

      expect(sendNotification).toHaveBeenCalledWith(mockedMessage);
    });
  });

  describe('handleQCResponse main function', () => {
    const mockSocket = io(fake.SOCKET_ENDPOINT);
    const mockIO = { sockets: mockSocket };
    const s3Output = { Body: JSON.stringify(fake.S3_WORKER_RESULT) };

    const experimentInstance = Experiment();

    beforeEach(() => {
      jest.clearAllMocks();

      AWSMock.restore();
      getPipelineStatus.mockImplementationOnce(() => ({
        qc: {
          status: constants.SUCCEEDED,
        },
      }));
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

      await handleQCResponse(mockIO, message);

      expect(hookRunnerInstance.run).toHaveBeenCalled();

      expect(mockSocket.emit).toHaveBeenCalledWith(`ExperimentUpdates-${fake.EXPERIMENT_ID}`,
        expect.objectContaining({
          type: constants.QC_PROCESS_NAME,
          experimentId: fake.EXPERIMENT_ID,
          taskName: constants.ASSIGN_POD_TO_PIPELINE,
        }));
    });


    it('Updates processing config when output contains a valid config', async () => {
      experimentInstance.findById.mockReturnValueOnce(
        { first: () => Promise.resolve({ processingConfig: fake.CELL_SIZE_PROCESSING_CONFIG }) },
      );

      const s3Spy = mockS3GetObject(s3Output);

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

      await handleQCResponse(mockIO, message);

      expect(validateRequest).toHaveBeenCalledWith(message, 'PipelineResponse.v2.yaml');
      expect(hookRunnerInstance.run).toHaveBeenCalledWith(message);

      expect(s3Spy).toHaveBeenCalledTimes(1);

      expect(experimentInstance.findById).toHaveBeenCalledTimes(1);
      expect(experimentInstance.findById.mock.calls).toMatchSnapshot();

      // Updates processing config when output contains a valid config
      expect(experimentInstance.updateProcessingConfig).toHaveBeenCalledTimes(1);
      expect(experimentInstance.updateProcessingConfig.mock.calls).toMatchSnapshot();
    });

    it('Sends updates when there are errors in the message', async () => {
      const s3Spy = mockS3GetObject(s3Output);

      experimentInstance.findById.mockReturnValueOnce(
        { first: () => Promise.resolve({ processingConfig: fake.CELL_SIZE_PROCESSING_CONFIG }) },
      );

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

      await handleQCResponse(mockIO, message);

      expect(s3Spy).toHaveBeenCalledWith({ Bucket: fake.S3_BUCKET, Key: fake.S3_KEY });

      expect(experimentInstance.updateProcessingConfig).toHaveBeenCalledTimes(1);
      expect(experimentInstance.updateProcessingConfig.mock.calls).toMatchSnapshot();

      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.emit).toHaveBeenCalledWith(`ExperimentUpdates-${fake.EXPERIMENT_ID}`,
        expect.objectContaining({
          type: constants.QC_PROCESS_NAME,
          experimentId: fake.EXPERIMENT_ID,
          response: { error: true },
        }));
    });
  });
});
