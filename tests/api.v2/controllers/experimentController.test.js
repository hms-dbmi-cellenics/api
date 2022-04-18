// @ts-nocheck
const Experiment = require('../../../src/api.v2/model/Experiment');
const UserAccess = require('../../../src/api.v2/model/UserAccess');
const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

const getPipelineStatus = require('../../../src/api.v2/helpers/pipeline/getPipelineStatus');
const getWorkerStatus = require('../../../src/api.v2/helpers/worker/getWorkerStatus');

const experimentInstance = Experiment();
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
jest.mock('../../../src/api.v2/model/UserAccess');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));
jest.mock('../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../src/api.v2/helpers/worker/getWorkerStatus');

const getExperimentResponse = require('../mocks/data/getExperimentResponse.json');
const getAllExperimentsResponse = require('../mocks/data/getAllExperimentsResponse.json');

const experimentController = require('../../../src/api.v2/controllers/experimentController');
const { OK } = require('../../../src/utils/responses');

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
});
