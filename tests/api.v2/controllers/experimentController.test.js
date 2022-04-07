// @ts-nocheck
// const experimentModel = require('../../../src/api.v2/model/Experiment')();
const experimentModel = require('../../../src/api.v2/model/Experiment')();
const userAccessModel = require('../../../src/api.v2/model/UserAccess')();
const { mockSqlClient } = require('../mocks/getMockSqlClient')();

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

const getExperimentResponse = require('../mocks/data/getExperimentResponse.json');
const getAllExperimentsResponse = require('../mocks/data/getAllExperimentsResponse.json');

const experimentController = require('../../../src/api.v2/controllers/experimentController');

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

    console.log('experimentModelDebug');
    console.log(experimentModel);

    experimentModel.getAllExperiments.mockImplementationOnce(
      () => Promise.resolve(getAllExperimentsResponse),
    );

    await experimentController.getAllExperiments(mockReq, mockRes);

    expect(experimentModel.getAllExperiments).toHaveBeenCalledWith('mockUserId');
    expect(mockRes.json).toHaveBeenCalledWith(getAllExperimentsResponse);
  });

  it('getExperiment works correctly', async () => {
    const mockReq = { params: { experimentId: getExperimentResponse.id } };

    experimentModel.getExperimentData.mockImplementationOnce(
      () => Promise.resolve(getExperimentResponse),
    );

    await experimentController.getExperiment(mockReq, mockRes);

    expect(experimentModel.getExperimentData).toHaveBeenCalledWith(getExperimentResponse.id);
    expect(mockRes.json).toHaveBeenCalledWith(getExperimentResponse);
  });

  it('createExperiment works correctly', async () => {
    userAccessModel.createNewExperimentPermissions.mockImplementationOnce(() => Promise.resolve());
    experimentModel.create.mockImplementationOnce(() => Promise.resolve([mockExperiment]));

    await experimentController.createExperiment(mockReqCreateExperiment, mockRes);

    expect(experimentModel.create).toHaveBeenCalledWith({
      id: mockExperiment.id,
      name: 'mockName',
      description: 'mockDescription',
    });

    expect(userAccessModel.createNewExperimentPermissions).toHaveBeenCalledWith('mockSub', mockExperiment.id);

    expect(experimentModel.create).toHaveBeenCalledTimes(1);
    expect(userAccessModel.createNewExperimentPermissions).toHaveBeenCalledTimes(1);
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

    experimentModel.update.mockImplementationOnce(() => Promise.resolve());

    await experimentController.patchExperiment(mockReq, mockRes);

    expect(experimentModel.update).toHaveBeenCalledWith(
      mockExperiment.id,
      { description: 'mockDescription' },
    );
  });

  it('updateSamplePosition works correctly', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: { newPosition: 1, oldPosition: 5 },
    };

    experimentModel.updateSamplePosition.mockImplementationOnce(() => Promise.resolve());

    await experimentController.updateSamplePosition(mockReq, mockRes);

    expect(experimentModel.updateSamplePosition).toHaveBeenCalledWith(
      mockExperiment.id,
      5,
      1,
    );
  });

  it('updateSamplePosition skips reordering if possible', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperiment.id,
      },
      body: { newPosition: 1, oldPosition: 1 },
    };

    await experimentController.updateSamplePosition(mockReq, mockRes);

    expect(experimentModel.updateSamplePosition).not.toHaveBeenCalled();
  });
});
