// @ts-nocheck
const getExperimentUsers = require('../../../src/api.v2/helpers/access/getExperimentUsers');
const userAccessController = require('../../../src/api.v2/controllers/accessController');

jest.mock('../../../src/api.v2/helpers/access/getExperimentUsers');

const mockRes = {
  json: jest.fn(),
};

const mockUsersList = [
  {
    name: 'Mock Admin',
    email: 'admin@example.com',
    role: 'admin',
  },
  {
    name: 'Mock User',
    email: 'user@example.com',
    role: 'owner',
  },
];

describe('accessController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('getExperimentUsers works correctly', async () => {
    const mockReq = { params: { experimentId: 'mockExperimentId' } };

    getExperimentUsers.mockImplementationOnce(
      () => Promise.resolve(mockUsersList),
    );

    await userAccessController.getUserAccess(mockReq, mockRes);

    expect(getExperimentUsers).toHaveBeenCalledWith('mockExperimentId');
    expect(mockRes.json).toHaveBeenCalledWith(mockUsersList);
  });
});
