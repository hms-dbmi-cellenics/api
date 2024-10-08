// @ts-nocheck
const io = require('socket.io-client');

const { startObj2sPipeline, handleObj2sResponse } = require('../../../../src/api.v2/helpers/pipeline/obj2s');

const Experiment = require('../../../../src/api.v2/model/Experiment');
const Sample = require('../../../../src/api.v2/model/Sample');
const ExperimentExecution = require('../../../../src/api.v2/model/ExperimentExecution');
const ExperimentParent = require('../../../../src/api.v2/model/ExperimentParent');

const pipelineConstruct = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct');
const getPipelineStatus = require('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
const HookRunner = require('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');

const validateRequest = require('../../../../src/utils/schema-validator');

const constants = require('../../../../src/api.v2/constants');

jest.mock('socket.io-client');

jest.mock('../../../../src/api.v2/model/Experiment');
jest.mock('../../../../src/api.v2/model/Sample');
jest.mock('../../../../src/api.v2/model/ExperimentExecution');
jest.mock('../../../../src/api.v2/model/ExperimentParent');

jest.mock('../../../../src/api.v2/helpers/pipeline/pipelineConstruct');
jest.mock('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');

jest.mock('../../../../src/utils/schema-validator');

const experimentInstance = Experiment();
const sampleInstance = Sample();
const experimentExecutionInstance = ExperimentExecution();
const experimentParentInstance = ExperimentParent();
const hookRunnerInstance = HookRunner();

const experimentId = 'mockExperimentId';
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

describe('startObj2sPipeline', () => {
  const mockSamples = [{
    id: 'fc68aefc-c3ca-467f-8589-f1dbaaac1c1e',
    experimentId: '8e282f0d-aadb-8032-a334-982a371efd0f',
    name: 'scdata',
    sampleTechnology: 'obj2s',
    createdAt: '2022-05-10 15:41:10.057808+00',
    updatedAt: '2022-05-10 15:41:10.057808+00',
    metadata: {},
    files: {
      obj2s: {
        size: 5079737, s3Path: '68f74995-3689-401a-90e0-145e08049cd5', uploadStatus: 'uploaded', sampleFileType: 'seurat',
      },
    },
  }];

  const mockStateMachineArn = 'mockStateMachineArn';
  const mockExecutionArn = 'mockExecutionArn';

  beforeEach(() => {
    experimentInstance.findById.mockClear();
    sampleInstance.getSamples.mockClear();
    experimentExecutionInstance.upsert.mockClear();
    experimentExecutionInstance.delete.mockClear();
    experimentParentInstance.isSubset.mockClear();
    pipelineConstruct.createObj2sPipeline.mockClear();

    experimentInstance.findById.mockReturnValueOnce({
      first: jest.fn(() => Promise.resolve(mockExperiment)),
    });

    sampleInstance.getSamples.mockReturnValueOnce(Promise.resolve(mockSamples));
    experimentParentInstance.isSubset.mockReturnValueOnce(Promise.resolve(false));
    pipelineConstruct.createObj2sPipeline.mockReturnValueOnce(
      { stateMachineArn: mockStateMachineArn, executionArn: mockExecutionArn },
    );
  });

  it('works correctly', async () => {
    const mockParams = {
      experimentId,
    };

    await startObj2sPipeline(mockParams, authJWT);
    expect(experimentInstance.findById).toHaveBeenCalledWith(experimentId);
    expect(sampleInstance.getSamples).toHaveBeenCalledWith(experimentId);
    expect(experimentExecutionInstance.updateExecution.mock.calls[0]).toMatchSnapshot();
    expect(experimentExecutionInstance.delete.mock.calls[0]).toMatchSnapshot();
    expect(pipelineConstruct.createObj2sPipeline.mock.calls[0]).toMatchSnapshot();
  });
});

describe('obj2sResponse', () => {
  const mockGetPipelineStatusResponse = {
    status: {
      obj2s: {
        startDate: '2022-05-10T16:30:16.268Z',
        stopDate: null,
        status: 'RUNNING',
        error: false,
        completedSteps: ['DownloadObj2sFile'],
        shouldRerun: true,
      },
    },
  };

  beforeEach(() => {
    io.sockets = { emit: jest.fn() };

    experimentInstance.updateById.mockClear();

    pipelineConstruct.createQCPipeline.mockClear();

    hookRunnerInstance.run.mockClear();

    getPipelineStatus.mockReturnValueOnce(mockGetPipelineStatusResponse);
  });

  it('works correctly', async () => {
    const message = {
      experimentId, authJWT: 'mockAuthJWT', input: { authJWT: 'mockAuthJWT' }, response: {},
    };

    await handleObj2sResponse(io, message);

    expect(validateRequest).toHaveBeenCalledWith(message, 'OBJ2SResponse.v2.yaml');
    expect(hookRunnerInstance.run).toHaveBeenCalledWith(message);

    expect(getPipelineStatus).toHaveBeenCalledWith(experimentId, constants.OBJ2S_PROCESS_NAME);
    expect(io.sockets.emit.mock.calls[0]).toMatchSnapshot();
  });
});
