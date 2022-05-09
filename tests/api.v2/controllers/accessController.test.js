// @ts-nocheck
const userAccessController = require('../../../src/api.v2/controllers/accessController');
const getExperimentUsers = require('../../../src/api.v2/helpers/access/getExperimentUsers');
const createUserInvite = require('../../../src/api.v2/helpers/access/createUserInvite');
const removeAccess = require('../../../src/api.v2/helpers/access/removeAccess');

const OK = require('../../../src/utils/responses/OK');
const AccessRole = require('../../../src/utils/enums/AccessRole');

jest.mock('../../../src/api.v2/helpers/access/getExperimentUsers');
jest.mock('../../../src/api.v2/helpers/access/createUserInvite');
jest.mock('../../../src/api.v2/helpers/access/removeAccess');

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

  it('inviteUser works correctly', async () => {
    const mockReq = {
      user: { email: 'owner@example.com' },
      params: { experimentId: 'mockExperimentId' },
      body: { userEmail: 'user@example.com', role: AccessRole.ADMIN },
    };

    createUserInvite.mockImplementationOnce(
      () => Promise.resolve(),
    );

    await userAccessController.inviteUser(mockReq, mockRes);

    const callParams = createUserInvite.mock.calls[0];

    expect(callParams).toMatchSnapshot();
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('revokeAccess works correctly', async () => {
    const mockReq = {
      params: { experimentId: 'mockExperimentId' },
      body: { userEmail: 'user@example.com' },
    };

    removeAccess.mockImplementationOnce(
      () => Promise.resolve(),
    );

    await userAccessController.revokeAccess(mockReq, mockRes);

    const callParams = removeAccess.mock.calls[0];

    expect(callParams).toMatchSnapshot();
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });
});
