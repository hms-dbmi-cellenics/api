// @ts-nocheck
const _ = require('lodash');

const Experiment = require('../../../src/api.v2/model/Experiment');
const Sample = require('../../../src/api.v2/model/Sample');
const UserAccess = require('../../../src/api.v2/model/UserAccess');
const ExperimentExecution = require('../../../src/api.v2/model/ExperimentExecution');
const Plot = require('../../../src/api.v2/model/Plot');

const getExperimentBackendStatus = require('../../../src/api.v2/helpers/backendStatus/getExperimentBackendStatus');
const pipelineConstruct = require('../../../src/api.v2/helpers/pipeline/pipelineConstruct');

const invalidatePlotsForEvent = require('../../../src/utils/plotConfigInvalidation/invalidatePlotsForEvent');
const events = require('../../../src/utils/plotConfigInvalidation/events');

const bucketNames = require('../../../src/config/bucketNames');

const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();
const getExperimentResponse = require('../mocks/data/getExperimentResponse.json');
const getAllExperimentsResponse = require('../mocks/data/getAllExperimentsResponse.json');

const experimentController = require('../../../src/api.v2/controllers/experimentController');
const { OK, NotFoundError } = require('../../../src/utils/responses');
const {
  OLD_QC_NAME_TO_BE_REMOVED, QC_PROCESS_NAME, GEM2S_PROCESS_NAME, SUCCEEDED, NOT_CREATED, RUNNING,
} = require('../../../src/api.v2/constants');
const getAdminSub = require('../../../src/utils/getAdminSub');
const LockedError = require('../../../src/utils/responses/LockedError');

const experimentInstance = Experiment();
const sampleInstance = Sample();
const userAccessInstance = UserAccess();
const experimentExecutionInstance = ExperimentExecution();
const plotInstance = Plot();

const mockExperiment = {
  id: 'mockExperimentId',
  name: 'mockExperimentName',
  description: 'mockExperimentDescription',
  samples_order: [],
  notify_by_email: true,
  created_at: '1900-03-23 21:06:00.573142+00',
  updated_at: '1900-03-26 21:06:00.573142+00',
};

jest.mock('../../../src/api.v2/model/Experiment');
jest.mock('../../../src/api.v2/model/Sample');
jest.mock('../../../src/api.v2/model/UserAccess');
jest.mock('../../../src/api.v2/model/MetadataTrack');
jest.mock('../../../src/api.v2/model/ExperimentExecution');
jest.mock('../../../src/api.v2/model/Plot');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));
jest.mock('../../../src/api.v2/helpers/pipeline/pipelineConstruct');
jest.mock('../../../src/api.v2/helpers/backendStatus/getExperimentBackendStatus');

jest.mock('../../../src/utils/plotConfigInvalidation/invalidatePlotsForEvent');
jest.mock('../../../src/utils/getAdminSub');

const mockReqCreateExperiment = {
  params: {
    experimentId: mockExperiment.id,
  },
  user: {
    sub: 'mockSub',
  },
  body: {
    name: 'mockName',
    description: 'mockDescription',
  },
};

const mockRes = {
  json: jest.fn(),
};

describe('experimentController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('getAllExperiments works correctly', async () => {
    const mockReq = { user: { sub: 'mockUserId' } };

    experimentInstance.getAllExperiments.mockImplementationOnce(
      () => Promise.resolve(getAllExperimentsResponse),
    );

    await experimentController.getAllExperiments(mockReq, mockRes);

    expect(experimentInstance.getAllExperiments).toHaveBeenCalledWith('mockUserId');
    expect(mockRes.json).toHaveBeenCalledWith(getAllExperimentsResponse);
  });

  it('getExampleExperiments works correctly', async () => {
    const mockReq = { user: { sub: 'mockUserId' } };

    experimentInstance.getExampleExperiments.mockImplementationOnce(
      () => Promise.resolve(getAllExperimentsResponse),
    );

    await experimentController.getExampleExperiments(mockReq, mockRes);

    expect(experimentInstance.getExampleExperiments).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(getAllExperimentsResponse);
  });

  it('getExperiment works correctly', async () => {
    const mockReq = { params: { experimentId: getExperimentResponse.id } };

    experimentInstance.getExperimentData.mockImplementationOnce(
      () => Promise.resolve(getExperimentResponse),
    );

    await experimentController.getExperiment(mockReq, mockRes);

    expect(experimentInstance.getExperimentData).toHaveBeenCalledWith(getExperimentResponse.id);
    expect(mockRes.json).toHaveBeenCalledWith(getExperimentResponse);
  });

  it('createExperiment works correctly', async () => {
    userAccessInstance.createNewExperimentPermissions.mockImplementationOnce(
      () => Promise.resolve(),
    );
    experimentInstance.create.mockImplementationOnce(() => Promise.resolve([mockExperiment]));

    await experimentController.createExperiment(mockReqCreateExperiment, mockRes);

    // Used with transactions
    expect(Experiment).toHaveBeenCalledWith(mockTrx);
    expect(UserAccess).toHaveBeenCalledWith(mockTrx);

    // Not used without transactions
    expect(Experiment).not.toHaveBeenCalledWith(mockSqlClient);
    expect(UserAccess).not.toHaveBeenCalledWith(mockSqlClient);

    expect(experimentInstance.create.mock.calls).toMatchSnapshot();

    expect(userAccessInstance.createNewExperimentPermissions).toHaveBeenCalledWith('mockSub', mockExperiment.id);

    expect(experimentInstance.create).toHaveBeenCalledTimes(1);
    expect(userAccessInstance.createNewExperimentPermissions).toHaveBeenCalledTimes(1);

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('createExperiment errors out if the transaction failed', async () => {
    mockSqlClient.transaction.mockImplementationOnce(() => Promise.reject(new Error()));

    await expect(
      experimentController.createExperiment(mockReqCreateExperiment, mockRes),
    ).rejects.toThrow();

    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('patchExperiment works correctly', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: {
        description: 'mockDescription',
      },
    };

    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve());

    await experimentController.patchExperiment(mockReq, mockRes);

    expect(experimentInstance.updateById).toHaveBeenCalledWith(
      mockExperiment.id,
      { description: 'mockDescription' },
    );

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('deleteExperiment works correctly', async () => {
    const mockReq = { params: { experimentId: mockExperiment.id } };

    experimentInstance.deleteById.mockImplementationOnce(() => Promise.resolve([{ id: 'mockExperiment.id' }]));

    await experimentController.deleteExperiment(mockReq, mockRes);

    expect(experimentInstance.deleteById).toHaveBeenCalledWith(mockExperiment.id);

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('deleteExperiment throws if experiment was not found', async () => {
    const mockReq = { params: { experimentId: mockExperiment.id } };

    experimentInstance.deleteById.mockImplementationOnce(() => Promise.resolve([]));

    await expect(
      experimentController.deleteExperiment(mockReq, mockRes),
    ).rejects.toThrow(
      new NotFoundError(`Experiment ${mockExperiment.id} not found`),
    );

    expect(experimentInstance.deleteById).toHaveBeenCalledWith(mockExperiment.id);

    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('updateSamplePosition works correctly', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: { newPosition: 1, oldPosition: 5 },
    };

    const samplesNewOrder = ['sample-id0', 'sample-id5', 'sample-id1', 'sample-id2', 'sample-id3', 'sample-id4', 'sample-id6'];

    experimentInstance.updateSamplePosition.mockImplementationOnce(
      () => Promise.resolve(samplesNewOrder),
    );

    await experimentController.updateSamplePosition(mockReq, mockRes);

    expect(experimentInstance.updateSamplePosition).toHaveBeenCalledWith(
      mockExperiment.id,
      5,
      1,
    );

    expect(mockRes.json).toHaveBeenCalledWith(samplesNewOrder);
  });

  it('updateSamplePosition skips reordering if possible', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: { newPosition: 1, oldPosition: 1 },
    };

    await experimentController.updateSamplePosition(mockReq, mockRes);

    expect(experimentInstance.updateSamplePosition).not.toHaveBeenCalled();
  });

  it('getProcessingConfig works', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
    };
    experimentInstance.getProcessingConfig.mockImplementationOnce(() => Promise.resolve());

    await experimentController.getProcessingConfig(mockReq, mockRes);
    expect(experimentInstance.getProcessingConfig).toHaveBeenCalledWith(mockExperiment.id);
  });

  it('updateProcessingConfig works', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: [{
        name: 'classifier',
        body: {
          someChangedField: 'a value',
        },
      }],
    };
    experimentInstance.updateProcessingConfig.mockImplementationOnce(() => Promise.resolve());

    await experimentController.updateProcessingConfig(mockReq, mockRes);
    expect(experimentInstance.updateProcessingConfig).toHaveBeenCalledWith(
      mockExperiment.id, mockReq.body,
    );

    // If configureEmbedding isnt included in changes, then invalidate isnt called
    expect(invalidatePlotsForEvent).not.toHaveBeenCalled();
  });

  it('Dependent plot configs are invalidated when ConfigureEmbedding is updated', async () => {
    experimentInstance.updateProcessingConfig.mockImplementationOnce(() => Promise.resolve());

    const mockSockets = 'mockSockets';
    const mockIo = { sockets: mockSockets };
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: [{
        name: 'configureEmbedding',
        body: {
          someChangedField: 'a value',
        },
      }],
      app: { get: jest.fn(() => mockIo) },
    };

    await experimentController.updateProcessingConfig(mockReq, mockRes);

    expect(experimentInstance.updateProcessingConfig).toHaveBeenCalledWith(
      mockExperiment.id, mockReq.body,
    );

    expect(invalidatePlotsForEvent).toHaveBeenCalledWith(
      mockExperiment.id,
      events.EMBEDDING_MODIFIED,
      mockSockets,
    );
  });

  it('getBackendStatus works correctly', async () => {
    getExperimentBackendStatus.mockImplementationOnce(() => Promise.resolve({
      worker: 'workerStatus',
      [QC_PROCESS_NAME]: 'qcStatus',
      [GEM2S_PROCESS_NAME]: 'gem2sStatus',
    }));

    const mockReq = { params: { experimentId: mockExperiment.id } };

    await experimentController.getBackendStatus(mockReq, mockRes);

    expect(getExperimentBackendStatus).toHaveBeenCalledWith(mockExperiment.id);
  });

  it('Get download link works correctly', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
        type: bucketNames.PROCESSED_MATRIX,
      },
    };

    await experimentController.downloadData(mockReq, mockRes);
    expect(experimentInstance.getDownloadLink)
      .toHaveBeenCalledWith(mockExperiment.id, bucketNames.PROCESSED_MATRIX);
  });

  it('cloneExperiment works correctly', async () => {
    const originalSampleIds = getExperimentResponse.samplesOrder;

    const clonedSamplesIds = ['mockClonedSample1', 'mockClonedSample2'];

    const userId = 'mockUserId';
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: {},
      user: { sub: userId },
    };

    const mockBackendStatus = {
      [OLD_QC_NAME_TO_BE_REMOVED]: { status: SUCCEEDED },
      [GEM2S_PROCESS_NAME]: { status: SUCCEEDED },
    };

    const stateMachineArn = 'mockStateMachineArn';
    const executionArn = 'mockExecutionArn';

    const expectedSampleIdsMap = _.zipObject(originalSampleIds, clonedSamplesIds);

    getExperimentBackendStatus.mockImplementationOnce(() => Promise.resolve(mockBackendStatus));
    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(toExperimentId));
    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(getExperimentResponse) },
    );
    sampleInstance.copyTo.mockImplementationOnce(() => Promise.resolve(clonedSamplesIds));
    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve());
    experimentExecutionInstance.copyTo.mockImplementationOnce(() => Promise.resolve());
    plotInstance.copyTo.mockImplementationOnce(() => Promise.resolve());

    pipelineConstruct.createCopyPipeline.mockImplementationOnce(() => Promise.resolve({
      stateMachineArn,
      executionArn,
    }));

    await experimentController.cloneExperiment(mockReq, mockRes);

    expect(experimentInstance.findById).toHaveBeenCalledWith(mockExperiment.id);

    // Creates new experiment
    expect(experimentInstance.createCopy).toHaveBeenCalledWith(mockExperiment.id, undefined);
    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(userId, toExperimentId);

    // Creates copy samples for new experiment
    expect(sampleInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, originalSampleIds);

    // Sets created samples and translated processing config in experiment
    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot();

    expect(experimentExecutionInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, expectedSampleIdsMap);
    expect(plotInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, expectedSampleIdsMap);
    expect(pipelineConstruct.createCopyPipeline)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, expectedSampleIdsMap);

    expect(experimentExecutionInstance.upsert).toHaveBeenCalledWith(
      { experiment_id: toExperimentId, pipeline_type: 'gem2s' },
      { state_machine_arn: stateMachineArn, execution_arn: executionArn },
    );

    expect(mockRes.json).toHaveBeenCalledWith(toExperimentId);
  });

  it('cloneExperiment works correctly when the original experiment never ran gem2s', async () => {
    const notRunExperiment = _.cloneDeep(getExperimentResponse);
    notRunExperiment.processingConfig = {};

    const originalSampleIds = notRunExperiment.samplesOrder;

    const clonedSamplesIds = ['mockClonedSample1', 'mockClonedSample2'];

    const userId = 'mockUserId';
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: {},
      user: { sub: userId },
    };

    const mockBackendStatus = {
      [OLD_QC_NAME_TO_BE_REMOVED]: { status: NOT_CREATED },
      [GEM2S_PROCESS_NAME]: { status: NOT_CREATED },
    };

    getExperimentBackendStatus.mockImplementationOnce(() => Promise.resolve(mockBackendStatus));
    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(toExperimentId));
    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(notRunExperiment) },
    );
    sampleInstance.copyTo.mockImplementationOnce(() => Promise.resolve(clonedSamplesIds));
    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve());

    await experimentController.cloneExperiment(mockReq, mockRes);

    expect(experimentInstance.findById).toHaveBeenCalledWith(mockExperiment.id);

    // Creates new experiment
    expect(experimentInstance.createCopy).toHaveBeenCalledWith(mockExperiment.id, undefined);
    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(userId, toExperimentId);

    // Creates copy samples for new experiment
    expect(sampleInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, originalSampleIds);

    // Sets created samples and translated processing config in experiment
    expect(experimentInstance.updateById).toHaveBeenCalledWith(
      toExperimentId,
      {
        samples_order: JSON.stringify(clonedSamplesIds),
        processing_config: JSON.stringify({}),
      },
    );

    // There's nothing to copy, so check nothing is copied
    expect(experimentExecutionInstance.copyTo).not.toHaveBeenCalled();
    expect(plotInstance.copyTo).not.toHaveBeenCalled();
    expect(pipelineConstruct.createCopyPipeline).not.toHaveBeenCalled();

    expect(experimentExecutionInstance.upsert).not.toHaveBeenCalled();

    expect(mockRes.json).toHaveBeenCalledWith(toExperimentId);
  });

  it('cloneExperiment works correctly when the original experiment never ran gem2s', async () => {
    const originalSampleIds = getExperimentResponse.samplesOrder;
    const mockClonedExperimentName = 'customNameClonedExp';

    const clonedSamplesIds = ['mockClonedSample1', 'mockClonedSample2'];

    const userId = 'mockUserId';
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: { name: mockClonedExperimentName },
      user: { sub: userId },
    };

    const mockBackendStatus = {
      [OLD_QC_NAME_TO_BE_REMOVED]: { status: SUCCEEDED },
      [GEM2S_PROCESS_NAME]: { status: SUCCEEDED },
    };

    const stateMachineArn = 'mockStateMachineArn';
    const executionArn = 'mockExecutionArn';

    const expectedSampleIdsMap = _.zipObject(originalSampleIds, clonedSamplesIds);

    getExperimentBackendStatus.mockImplementationOnce(() => Promise.resolve(mockBackendStatus));
    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(toExperimentId));
    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(getExperimentResponse) },
    );
    sampleInstance.copyTo.mockImplementationOnce(() => Promise.resolve(clonedSamplesIds));
    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve());
    experimentExecutionInstance.copyTo.mockImplementationOnce(() => Promise.resolve());
    plotInstance.copyTo.mockImplementationOnce(() => Promise.resolve());

    pipelineConstruct.createCopyPipeline.mockImplementationOnce(() => Promise.resolve({
      stateMachineArn,
      executionArn,
    }));

    await experimentController.cloneExperiment(mockReq, mockRes);

    expect(experimentInstance.findById).toHaveBeenCalledWith(mockExperiment.id);

    // Creates new experiment with custom name
    expect(experimentInstance.createCopy)
      .toHaveBeenCalledWith(mockExperiment.id, mockClonedExperimentName);
    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(userId, toExperimentId);

    // Creates copy samples for new experiment
    expect(sampleInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, originalSampleIds);

    // Sets created samples and translated processing config in experiment
    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot();

    expect(experimentExecutionInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, expectedSampleIdsMap);
    expect(plotInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, expectedSampleIdsMap);
    expect(pipelineConstruct.createCopyPipeline)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, expectedSampleIdsMap);

    expect(experimentExecutionInstance.upsert).toHaveBeenCalledWith(
      { experiment_id: toExperimentId, pipeline_type: 'gem2s' },
      { state_machine_arn: stateMachineArn, execution_arn: executionArn },
    );

    expect(mockRes.json).toHaveBeenCalledWith(toExperimentId);
  });

  it('cloneExperiment for another user fails', async () => {
    const mockClonedExperimentName = 'cloned this experiment for you';
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: {
        name: mockClonedExperimentName,
        toUserId: 'mockUserId-asdasd-343-123sd',
      },
      user: { sub: await getAdminSub() },
    };
    const allSampleIds = ['mockSample1', 'mockSample2', 'mockSample3', 'mockSample4'];
    const clonedSamplesIds = ['mockClonedSample1', 'mockClonedSample2', 'mockClonedSample3', 'mockClonedSample4'];

    experimentInstance.createCopy.mockImplementation(() => Promise.resolve(toExperimentId));
    experimentInstance.findById
      .mockReturnValue({ first: () => Promise.resolve({ samplesOrder: allSampleIds }) });
    experimentInstance.updateById.mockImplementation(() => Promise.resolve());
    sampleInstance.copyTo.mockImplementation(() => Promise.resolve(clonedSamplesIds));

    // should fail if the request is not from the admin
    mockReq.user.sub = 'not-admin-user';
    await expect(experimentController.cloneExperiment(mockReq, mockRes))
      .rejects
      .toThrow(`User ${mockReq.user.sub} cannot clone experiments for other users.`);
  });

  it('cloneExperiment fails if the original experiment is running a pipeline', async () => {
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: {},
      user: { sub: 'mockUserId' },
    };

    const mockBackendStatus = {
      [OLD_QC_NAME_TO_BE_REMOVED]: { status: RUNNING },
      [GEM2S_PROCESS_NAME]: { status: SUCCEEDED },
    };

    const allSampleIds = ['mockSample1', 'mockSample2', 'mockSample3', 'mockSample4'];
    const clonedSamplesIds = ['mockClonedSample1', 'mockClonedSample2', 'mockClonedSample3', 'mockClonedSample4'];

    experimentInstance.createCopy.mockImplementation(() => Promise.resolve(toExperimentId));
    experimentInstance.findById.mockReturnValue(
      { first: () => Promise.resolve({ samplesOrder: allSampleIds }) },
    );
    experimentInstance.updateById.mockImplementation(() => Promise.resolve());
    sampleInstance.copyTo.mockImplementation(() => Promise.resolve(clonedSamplesIds));
    getExperimentBackendStatus.mockImplementationOnce(() => Promise.resolve(mockBackendStatus));

    // this request should pass
    await expect(experimentController.cloneExperiment(mockReq, mockRes))
      .rejects
      .toThrow(new LockedError('Experiment is currently running a pipeline and can\'t be copied'));
  });
});
