// @ts-nocheck
const _ = require('lodash');
const io = require('socket.io-client');

const { startGem2sPipeline, handleGem2sResponse } = require('../../../../src/api.v2/helpers/pipeline/gem2s');

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

const gem2sUploadToAWSPayload = require('../../mocks/data/gem2sUploadToAWSPayload.json');

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


describe('startGem2sPipeline', () => {
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
    experimentExecutionInstance.delete.mockClear();
    experimentParentInstance.isSubset.mockClear();
    pipelineConstruct.createGem2SPipeline.mockClear();

    experimentInstance.findById.mockReturnValueOnce({
      first: jest.fn(() => Promise.resolve(mockExperiment)),
    });

    sampleInstance.getSamples.mockReturnValueOnce(Promise.resolve(mockSamples));
    experimentParentInstance.isSubset.mockReturnValueOnce(Promise.resolve(false));
    pipelineConstruct.createGem2SPipeline.mockReturnValueOnce(
      { stateMachineArn: mockStateMachineArn, executionArn: mockExecutionArn },
    );
  });

  it('works correctly', async () => {
    throw new Error();
    await startGem2sPipeline(experimentId, authJWT);
    expect(experimentInstance.findById).toHaveBeenCalledWith(experimentId);
    expect(sampleInstance.getSamples).toHaveBeenCalledWith(experimentId);
    expect(experimentExecutionInstance.upsert.mock.calls[0]).toMatchSnapshot();
    expect(experimentExecutionInstance.delete.mock.calls[0]).toMatchSnapshot();
    expect(pipelineConstruct.createGem2SPipeline.mock.calls[0]).toMatchSnapshot();
  });
});

describe('gem2sResponse', () => {
  const mockGetPipelineStatusResponse = {
    status: {
      gem2s: {
        startDate: '2022-05-10T16:30:16.268Z',
        stopDate: null,
        status: 'RUNNING',
        error: false,
        completedSteps: ['DownloadGem'],
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

    await handleGem2sResponse(io, message);

    expect(validateRequest).toHaveBeenCalledWith(message, 'GEM2SResponse.v2.yaml');
    expect(hookRunnerInstance.run).toHaveBeenCalledWith(message, io);

    expect(getPipelineStatus).toHaveBeenCalledWith(experimentId, constants.GEM2S_PROCESS_NAME);
    expect(io.sockets.emit.mock.calls[0]).toMatchSnapshot();
  });

  it('Starts a QC run when gem2s finishes', async () => {
    const stateMachineArn = 'mockStateMachineArn';
    const executionArn = 'mockExecutionArn';
    const message = {
      experimentId,
      authJWT: 'mockAuthJWT',
      input: { authJWT: 'mockAuthJWT' },
      taskName: 'uploadToAWS',
      item: gem2sUploadToAWSPayload.item,
      response: {},
      jobId: 'mockJobId',
    };

    pipelineConstruct.createQCPipeline.mockImplementationOnce(
      () => Promise.resolve({ stateMachineArn, executionArn }),
    );

    // There's a hook registered on the uploadToAWS step
    expect(hookRunnerInstance.register.mock.calls[1][0]).toEqual('uploadToAWS');

    await handleGem2sResponse(io, message);

    // It called hookRunner.run
    expect(hookRunnerInstance.run).toHaveBeenCalled();

    // Take the item passed to register
    const uploadToAWSPayload = hookRunnerInstance.run.mock.calls[0][0];

    // Take the hookedFunctions
    const hookedFunctions = hookRunnerInstance.register.mock.calls[1][1];
    expect(hookedFunctions).toHaveLength(1);

    // calling the hookedFunction triggers QC
    await hookedFunctions[0](uploadToAWSPayload);

    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot();
    expect(pipelineConstruct.createQCPipeline.mock.calls).toMatchSnapshot();
  });

  it('Starts a QC run when gem2s finishes and can duplicate defaultProcessingConfig ignoring entries that arent samples', async () => {
    const stateMachineArn = 'mockStateMachineArn';
    const executionArn = 'mockExecutionArn';

    const itemWithSomeStepFlag = _.cloneDeep(gem2sUploadToAWSPayload.item);

    // Add an entry that is applied to the whole step
    itemWithSomeStepFlag.processingConfig.doubletScores.someStepFlag = true;

    const payload = {
      experimentId,
      authJWT: 'mockAuthJWT',
      input: { authJWT: 'mockAuthJWT' },
      taskName: 'uploadToAWS',
      item: itemWithSomeStepFlag,
      response: {},
      jobId: 'mockJobId',
    };

    pipelineConstruct.createQCPipeline.mockImplementationOnce(
      () => Promise.resolve({ stateMachineArn, executionArn }),
    );

    // There's a hook registered on the uploadToAWS step
    expect(hookRunnerInstance.register.mock.calls[1][0]).toEqual('uploadToAWS');

    await handleGem2sResponse(io, payload);

    // It called hookRunner.run
    expect(hookRunnerInstance.run).toHaveBeenCalled();

    // Take the item passed to register
    const uploadToAWSPayload = hookRunnerInstance.run.mock.calls[0][0];

    // Take the hookedFunctions
    const hookedFunctions = hookRunnerInstance.register.mock.calls[1][1];
    expect(hookedFunctions).toHaveLength(1);

    // calling the hookedFunction triggers QC
    await hookedFunctions[0](uploadToAWSPayload);

    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot();
    expect(pipelineConstruct.createQCPipeline.mock.calls).toMatchSnapshot();
  });

  it('Updates the subset experiment when subsetSeurat is notified to have finished', async () => {
    const parentExperimentId = mockExperiment.id;
    const subsetExperimentId = 'mockSubsetExperimentId';

    const oldSampleId1 = 'old-sample-id-1';
    const newSampleId1 = 'new-sample-id-1';
    const oldSampleId2 = 'old-sample-id-2';
    const newSampleId2 = 'new-sample-id-2';

    const message = {
      sampleIdMap: {
        [oldSampleId1]: newSampleId1,
        [oldSampleId2]: newSampleId2,
      },
      taskName: 'subsetSeurat',
      experimentId: subsetExperimentId,
      jobId: '',
      authJWT: 'mockAuthJWT',
      input: {
        experimentId: subsetExperimentId,
        taskName: 'subsetSeurat',
        processName: 'subset',
        parentExperimentId,
        subsetExperimentId,
        cellSetKeys: ['louvain-2', 'louvain-3', 'louvain-0'],
      },
    };

    experimentInstance.findById.mockClear();
    experimentInstance.findById.mockReturnValueOnce({
      first: jest.fn(
        () => Promise.resolve({ ...mockExperiment, samplesOrder: [oldSampleId1, oldSampleId2] }),
      ),
    });

    // There's a hook registered on the subsetSeurat step
    expect(hookRunnerInstance.register.mock.calls[0][0]).toEqual('subsetSeurat');

    await handleGem2sResponse(io, message);

    // It called hookRunner.run
    expect(hookRunnerInstance.run).toHaveBeenCalled();

    // Take the item passed to register
    const subsetSeuratPayload = hookRunnerInstance.run.mock.calls[0][0];

    // Take the hookedFunctions
    const hookedFunctions = hookRunnerInstance.register.mock.calls[0][1];
    expect(hookedFunctions).toHaveLength(1);

    // calling the hookedFunction triggers updates on the subset experiment
    await hookedFunctions[0](subsetSeuratPayload);

    expect(sampleInstance.copyTo.mock.calls).toMatchSnapshot();
    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot();
  });
});
