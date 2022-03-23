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
jest.mock('../../../src/api.v2/model/experiment', () => ({
  create: jest.fn(() => Promise.resolve([mockExperiment])),
}));
jest.mock('../../../src/api.v2/model/userAccess', () => ({
  create: jest.fn(),
}));

const experimentController = require('../../../src/api.v2/controllers/experimentController');

describe('experimentController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Creating a new experiment works correctly', async () => {
    const mockReq = {
      params: {
        experimentId: 'mockId',
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

    await experimentController.createExperiment(mockReq, mockRes);

    expect(experimentModel.create).toHaveBeenCalledWith({
      id: 'mockId',
      name: 'mockName',
      description: 'mockDescription',
    });

    expect(userAccessModel.create).toHaveBeenCalledWith({
      user_id: 'mockSub',
      experiment_id: 'mockId',
      access_role: AccessRole.OWNER,
    });

    expect(userAccessModel.create).toHaveBeenCalledWith({
      user_id: config.adminSub,
      experiment_id: 'mockId',
      access_role: AccessRole.OWNER,
    });

    expect(experimentModel.create).toHaveBeenCalledTimes(1);
    expect(userAccessModel.create).toHaveBeenCalledTimes(2);
  });
});
