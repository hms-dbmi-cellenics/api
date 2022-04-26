// @ts-nocheck
const UserAccess = require('../../../src/api.v2/model/UserAccess');
const { mockSqlClient } = require('../mocks/getMockSqlClient')();
const userAccessController = require('../../../src/api.v2/controllers/accessController');

jest.mock('../../../src/api.v2/model/UserAccess');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const mockRes = {
  json: jest.fn(),
};

const userAccessInstance = UserAccess();

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

    userAccessInstance.getExperimentUsers.mockImplementationOnce(
      () => Promise.resolve(mockUsersList),
    );

    await userAccessController.getExperimentUsers(mockReq, mockRes);

    expect(userAccessInstance.getExperimentUsers).toHaveBeenCalledWith('mockExperimentId');
    expect(mockRes.json).toHaveBeenCalledWith(mockUsersList);
  });
});
