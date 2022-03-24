const config = require('../../../src/config');
const AccessRole = require('../../../src/utils/enums/AccessRole');

const experimentModel = require('../../../src/api.v2/model/experiment');
const userAccessModel = require('../../../src/api.v2/model/userAccess');

const mockExperiment = {
  id: 'mockExperimentId',
  name: 'mockExperimentName',
  description: 'mockExperimentDescription',
  samples_order: [],
  notify_by_email: true,
  created_at: '1900-03-23 21:06:00.573142+00',
  updated_at: '1900-03-26 21:06:00.573142+00',
};

const mockUserAccessCreateResults = [
  [{
    user_id: 'someUser', experiment_id: 'mockExperimentId', access_role: 'owner', updated_at: '1910-03-23 21:06:00.573142+00',
  }], [{
    user_id: 'theAdmin', experiment_id: 'mockExperimentId', access_role: 'owner', updated_at: '1910-03-23 21:06:00.573142+00',
  }],
];

jest.mock('../../../src/api.v2/model/experiment');
jest.mock('../../../src/api.v2/model/userAccess', () => ({
  create: jest.fn(),
}));

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

  it('createExperiment works correctly', async () => {
    userAccessModel.create
      // @ts-ignore
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]))
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[1]]));

    // @ts-ignore
    experimentModel.create.mockImplementationOnce(() => Promise.resolve([mockExperiment]));

    await experimentController.createExperiment(mockReqCreateExperiment, mockRes);

    expect(experimentModel.create).toHaveBeenCalledWith({
      id: mockExperiment.id,
      name: 'mockName',
      description: 'mockDescription',
    });

    expect(userAccessModel.create).toHaveBeenCalledWith({
      user_id: 'mockSub',
      experiment_id: mockExperiment.id,
      access_role: AccessRole.OWNER,
    });

    expect(userAccessModel.create).toHaveBeenCalledWith({
      user_id: config.adminSub,
      experiment_id: mockExperiment.id,
      access_role: AccessRole.OWNER,
    });

    expect(experimentModel.create).toHaveBeenCalledTimes(1);
    expect(userAccessModel.create).toHaveBeenCalledTimes(2);
  });

  it('createExperiment fails if the experiment creation didn\'t go through', async () => {
    // @ts-ignore
    experimentModel.create.mockImplementationOnce(() => Promise.resolve([]));

    await expect(experimentController.createExperiment(mockReqCreateExperiment, mockRes)).rejects.toThrow(`Experiment ${mockExperiment.id} creation failed`);

    expect(experimentModel.create).toHaveBeenCalledWith({
      id: mockExperiment.id,
      name: 'mockName',
      description: 'mockDescription',
    });
  });

  it('createExperiment fails if the user access creation didn\'t work well', async () => {
    userAccessModel.create
      // @ts-ignore
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]))
      .mockImplementationOnce(() => Promise.resolve([]));

    // @ts-ignore
    experimentModel.create.mockImplementationOnce(() => Promise.resolve([mockExperiment]));

    await expect(experimentController.createExperiment(mockReqCreateExperiment, mockRes)).rejects.toThrow(`User access creation failed for experiment ${mockExperiment.id}`);

    expect(experimentModel.create).toHaveBeenCalledWith({
      id: mockExperiment.id,
      name: 'mockName',
      description: 'mockDescription',
    });

    expect(userAccessModel.create).toHaveBeenCalledWith({
      user_id: 'mockSub',
      experiment_id: mockExperiment.id,
      access_role: AccessRole.OWNER,
    });

    expect(userAccessModel.create).toHaveBeenCalledWith({
      user_id: config.adminSub,
      experiment_id: mockExperiment.id,
      access_role: AccessRole.OWNER,
    });
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

    // @ts-ignore
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

    // @ts-ignore
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
