// @ts-nocheck
const Experiment = require('../../../src/api.v2/model/Experiment');
const Sample = require('../../../src/api.v2/model/Sample');
const UserAccess = require('../../../src/api.v2/model/UserAccess');
const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

const getPipelineStatus = require('../../../src/api.v2/helpers/pipeline/getPipelineStatus');
const getWorkerStatus = require('../../../src/api.v2/helpers/worker/getWorkerStatus');

const bucketNames = require('../../../src/api.v2/helpers/s3/bucketNames');

const experimentInstance = Experiment();
const sampleInstance = Sample();
const userAccessInstance = UserAccess();

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

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));
jest.mock('../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../src/api.v2/helpers/worker/getWorkerStatus');

const getExperimentResponse = require('../mocks/data/getExperimentResponse.json');
const getAllExperimentsResponse = require('../mocks/data/getAllExperimentsResponse.json');

const experimentController = require('../../../src/api.v2/controllers/experimentController');
const { OK, NotFoundError } = require('../../../src/utils/responses');

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

    expect(experimentInstance.create).toHaveBeenCalledWith({
      id: mockExperiment.id,
      name: 'mockName',
      description: 'mockDescription',
    });

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

    experimentInstance.updateSamplePosition.mockImplementationOnce(() => Promise.resolve());

    await experimentController.updateSamplePosition(mockReq, mockRes);

    expect(experimentInstance.updateSamplePosition).toHaveBeenCalledWith(
      mockExperiment.id,
      5,
      1,
    );

    expect(mockRes.json).toHaveBeenCalledWith(OK());
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

  it('updateSamplesOptions works correctly', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: { someOption: true, otherOption: false },
    };

    const whereSpy = jest.fn(() => Promise.resolve());
    const updateOptionSpy = jest.fn(() => ({ where: whereSpy }));
    sampleInstance.updateOption = updateOptionSpy;

    await experimentController.updateSamplesOptions(mockReq, mockRes);

    expect(updateOptionSpy).toHaveBeenCalledWith(mockReq.body);
    expect(whereSpy).toHaveBeenCalledWith({ experiment_id: mockExperiment.id });
    expect(mockRes.json).toHaveBeenCalledWith(OK());
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
  });

  it('getBackendStatus works correctly', async () => {
    getPipelineStatus
      .mockImplementationOnce(() => Promise.resolve('gem2sStatus'))
      .mockImplementationOnce(() => Promise.resolve('qcStatus'));
    getWorkerStatus.mockImplementationOnce(() => 'workerStatus');

    const mockReq = { params: { experimentId: mockExperiment.id } };

    await experimentController.getBackendStatus(mockReq, mockRes);

    expect(getPipelineStatus).toHaveBeenCalledWith(mockExperiment.id, 'gem2s');
    expect(getPipelineStatus).toHaveBeenCalledWith(mockExperiment.id, 'qc');
    expect(getWorkerStatus).toHaveBeenCalledWith(mockExperiment.id);
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

  it('cloneExperiment works correctly when samplesToCloneIds is provided', async () => {
    const samplesToCloneIds = ['mockSample2', 'mockSample3'];
    const clonedSamplesSubsetIds = ['mockClonedSample2', 'mockClonedSample3'];
    const userId = 'mockUserId';
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: { samplesToCloneIds },
      user: { sub: userId },
    };

    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(toExperimentId));
    sampleInstance.copyTo.mockImplementationOnce(
      () => Promise.resolve(clonedSamplesSubsetIds),
    );
    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve());

    await experimentController.cloneExperiment(mockReq, mockRes);

    // Creates new experiment
    expect(experimentInstance.createCopy).toHaveBeenCalledWith(mockExperiment.id, null);
    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(userId, toExperimentId);

    // Creates copy samples for new experiment
    expect(sampleInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, samplesToCloneIds);

    // Sets created sample in experiment
    expect(experimentInstance.updateById).toHaveBeenCalledWith(
      toExperimentId,
      { samples_order: JSON.stringify(clonedSamplesSubsetIds) },
    );

    expect(mockRes.json).toHaveBeenCalledWith(toExperimentId);
  });

  it('cloneExperiment works correctly when samplesToCloneIds is NOT provided', async () => {
    const allSampleIds = ['mockSample1', 'mockSample2', 'mockSample3', 'mockSample4'];
    const clonedSamplesIds = ['mockClonedSample1', 'mockClonedSample2', 'mockClonedSample3', 'mockClonedSample4'];
    const userId = 'mockUserId';
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: {},
      user: { sub: userId },
    };

    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(toExperimentId));
    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve({ samplesOrder: allSampleIds }) },
    );
    sampleInstance.copyTo.mockImplementationOnce(
      () => Promise.resolve(clonedSamplesIds),
    );
    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve());

    await experimentController.cloneExperiment(mockReq, mockRes);

    expect(experimentInstance.findById).toHaveBeenCalledWith(mockExperiment.id);

    // Creates new experiment
    expect(experimentInstance.createCopy).toHaveBeenCalledWith(mockExperiment.id, null);
    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(userId, toExperimentId);

    // Creates copy samples for new experiment
    expect(sampleInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, allSampleIds);

    // Sets created sample in experiment
    expect(experimentInstance.updateById).toHaveBeenCalledWith(
      toExperimentId,
      { samples_order: JSON.stringify(clonedSamplesIds) },
    );

    expect(mockRes.json).toHaveBeenCalledWith(toExperimentId);
  });


  it('cloneExperiment works correctly when name is provided', async () => {
    const allSampleIds = ['mockSample1', 'mockSample2', 'mockSample3', 'mockSample4'];
    const clonedSamplesIds = ['mockClonedSample1', 'mockClonedSample2', 'mockClonedSample3', 'mockClonedSample4'];
    const mockClonedExperimentName = 'Cloned experiment';
    const userId = 'mockUserId';
    const toExperimentId = 'mockToExperimentId';

    const mockReq = {
      params: { experimentId: mockExperiment.id },
      body: { name: mockClonedExperimentName },
      user: { sub: userId },
    };

    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(toExperimentId));
    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve({ samplesOrder: allSampleIds }) },
    );
    sampleInstance.copyTo.mockImplementationOnce(
      () => Promise.resolve(clonedSamplesIds),
    );
    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve());

    await experimentController.cloneExperiment(mockReq, mockRes);

    expect(experimentInstance.findById).toHaveBeenCalledWith(mockExperiment.id);

    // Creates new experiment
    expect(experimentInstance.createCopy).toHaveBeenCalledWith(
      mockExperiment.id,
      mockClonedExperimentName,
    );
    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(userId, toExperimentId);

    // Creates copy samples for new experiment
    expect(sampleInstance.copyTo)
      .toHaveBeenCalledWith(mockExperiment.id, toExperimentId, allSampleIds);

    // Sets created sample in experiment
    expect(experimentInstance.updateById).toHaveBeenCalledWith(
      toExperimentId,
      { samples_order: JSON.stringify(clonedSamplesIds) },
    );

    expect(mockRes.json).toHaveBeenCalledWith(toExperimentId);
  });
});
