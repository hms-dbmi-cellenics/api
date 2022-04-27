// @ts-nocheck
const getUserRoles = require('../../../src/api.v2/helpers/access/getUserRoles');
const userAccessController = require('../../../src/api.v2/controllers/accessController');

jest.mock('../../../src/api.v2/helpers/access/getUserRoles');

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

    getUserRoles.mockImplementationOnce(
      () => Promise.resolve(mockUsersList),
    );

    await userAccessController.getExperimentUsers(mockReq, mockRes);

    expect(getUserRoles).toHaveBeenCalledWith('mockExperimentId');
    expect(mockRes.json).toHaveBeenCalledWith(mockUsersList);
  });
});
