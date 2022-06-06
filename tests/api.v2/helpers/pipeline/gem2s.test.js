// @ts-nocheck
const io = require('socket.io-client');

const { gem2sCreate, gem2sResponse } = require('../../../../src/api.v2/helpers/pipeline/gem2s');

const Experiment = require('../../../../src/api.v2/model/Experiment');
const Sample = require('../../../../src/api.v2/model/Sample');
const ExperimentExecution = require('../../../../src/api.v2/model/ExperimentExecution');

const pipelineConstruct = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct');
const getPipelineStatus = require('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
const HookRunner = require('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');

const validateRequest = require('../../../../src/utils/schema-validator');

const constants = require('../../../../src/api.v2/helpers/pipeline/constants');

jest.mock('socket.io-client');

jest.mock('../../../../src/api.v2/model/Experiment');
jest.mock('../../../../src/api.v2/model/Sample');
jest.mock('../../../../src/api.v2/model/ExperimentExecution');

jest.mock('../../../../src/api.v2/helpers/pipeline/pipelineConstruct');
jest.mock('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');

jest.mock('../../../../src/utils/schema-validator');

const uploadToAWSPayload = require('../../mocks/data/gem2sUploadToAWSPayload.json');

const experimentInstance = Experiment();
const sampleInstance = Sample();
const experimentExecutionInstance = ExperimentExecution();

const hookRunnerInstance = HookRunner();

describe('gem2sCreate', () => {
  const experimentId = 'mockExperimentId';
  const paramsHash = 'mockParamsHash';
  const authJWT = 'mockAuthJWT';

  const mockExperiment = {
    id: '8e282f0d-aadb-8032-a334-982a371efd0f',
    name: 'asdsadsada',
    description: 'Analysis description',
    samplesOrder: ['fc68aefc-c3ca-467f-8589-f1dbaaac1c1e'],
    processingConfig: {},
    notifyByEmail: true,
    createdAt: '2022-05-10 15:41:04.165961+00',
    updatedAt: '2022-05-10 15:41:04.165961+00',
  };

  const mockSamples = [{
    id: 'fc68aefc-c3ca-467f-8589-f1dbaaac1c1e',
    experimentId: '8e282f0d-aadb-8032-a334-982a371efd0f',
    name: 'WT1',
    sampleTechnology: '10x',
    createdAt: '2022-05-10 15:41:10.057808+00',
    updatedAt: '2022-05-10 15:41:10.057808+00',
    metadata: { Track_1: 'N.A.' },
    files: {
      matrix10x: {
        size: 5079737, s3Path: '68f74995-3689-401a-90e0-145e08049cd5', uploadStatus: 'uploaded', sampleFileType: 'matrix10x',
      },
      barcodes10x: {
        size: 5331, s3Path: '37d9e601-9278-437c-a776-40fe94680833', uploadStatus: 'uploaded', sampleFileType: 'barcodes10x',
      },
      features10x: {
        size: 279361, s3Path: '1ee00087-e98a-4390-a3cb-392a3f6d09d8', uploadStatus: 'uploaded', sampleFileType: 'features10x',
      },
    },
  }];

  const mockStateMachineArn = 'mockStateMachineArn';
  const mockExecutionArn = 'mockExecutionArn';

  beforeEach(() => {
    experimentInstance.findById.mockClear();
    sampleInstance.getSamples.mockClear();
    experimentExecutionInstance.upsert.mockClear();
    pipelineConstruct.createGem2SPipeline.mockClear();

    experimentInstance.findById.mockReturnValueOnce({
      first: jest.fn(() => Promise.resolve(mockExperiment)),
    });

    sampleInstance.getSamples.mockReturnValueOnce(Promise.resolve(mockSamples));

    pipelineConstruct.createGem2SPipeline.mockReturnValueOnce(
      { stateMachineArn: mockStateMachineArn, executionArn: mockExecutionArn },
    );
  });

  it('works correctly', async () => {
    await gem2sCreate(experimentId, { paramsHash }, authJWT);

    expect(experimentInstance.findById).toHaveBeenCalledWith(experimentId);
    expect(sampleInstance.getSamples).toHaveBeenCalledWith(experimentId);
    expect(experimentExecutionInstance.upsert.mock.calls[0]).toMatchSnapshot();
    expect(pipelineConstruct.createGem2SPipeline.mock.calls[0]).toMatchSnapshot();
  });
});

const mockGetPipelineStatusResponse = {
  status: {
    gem2s: {
      startDate: '2022-05-10T16:30:16.268Z',
      stopDate: null,
      status: 'RUNNING',
      error: false,
      completedSteps: ['DownloadGem'],
      paramsHash: 'mockParamsHash',
    },
  },
};

describe('gem2sResponse', () => {
  const experimentId = 'mockExperimentId';
  const message = {
    experimentId, authJWT: 'mockAuthJWT', input: { authJWT: 'mockAuthJWT' }, response: {},
  };

  beforeEach(() => {
    io.sockets = { emit: jest.fn() };

    experimentInstance.updateById.mockClear();
    pipelineConstruct.createQCPipeline.mockClear();

    getPipelineStatus.mockReturnValueOnce(mockGetPipelineStatusResponse);
  });

  it('works correctly', async () => {
    await gem2sResponse(io, message);

    expect(validateRequest).toHaveBeenCalledWith(message, 'GEM2SResponse.v1.yaml');
    expect(hookRunnerInstance.run).toHaveBeenCalledWith(message);

    expect(getPipelineStatus).toHaveBeenCalledWith(experimentId, constants.GEM2S_PROCESS_NAME);
    expect(io.sockets.emit.mock.calls[0]).toMatchSnapshot();
  });

  it('Starts a QC run when gem2s finishes', async () => {
    const stateMachineArn = 'mockStateMachineArn';
    const executionArn = 'mockExecutionArn';

    pipelineConstruct.createQCPipeline.mockImplementationOnce(
      () => Promise.resolve({ stateMachineArn, executionArn }),
    );

    // There's a hook registered on the uploadToAWS step
    expect(hookRunnerInstance.register.mock.calls[0][0]).toEqual('uploadToAWS');

    const hookedFunctions = hookRunnerInstance.register.mock.calls[0][1];

    expect(hookedFunctions).toHaveLength(1);

    // calling the hookedFunction triggers QC
    await hookedFunctions[0](uploadToAWSPayload);

    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot();

    expect(pipelineConstruct.createQCPipeline.mock.calls).toMatchSnapshot();
  });
});
