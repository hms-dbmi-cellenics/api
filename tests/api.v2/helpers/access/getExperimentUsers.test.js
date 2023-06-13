// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck

const getUser = require('../../../../src/api.v2/helpers/cognito/getUser');

jest.mock('../../../../src/api.v2/helpers/cognito/getUser');

const UserAccess = require('../../../../src/api.v2/model/UserAccess');
const AccessRole = require('../../../../src/utils/enums/AccessRole');

const getExperimentUsers = require('../../../../src/api.v2/helpers/access/getExperimentUsers');

jest.mock('../../../../src/api.v2/model/UserAccess');

const experimentId = 'experimentId';

const mockGetExperimentUsersResults = [
  {
    userId: 'mockAdminSub',
    experimentId: 'mockExperimentId',
    accessRole: 'admin',
    updatedAt: '1910-03-23 21:06:00.573142+00',
  },
  {
    userId: 'someUser',
    experimentId: 'mockExperimentId',
    accessRole: 'owner',
    updatedAt: '1910-03-23 21:06:00.573142+00',
  },
];

const mockUserAccess = {
  getExperimentUsers: jest.fn(() => Promise.resolve(mockGetExperimentUsersResults)),
};

UserAccess.mockReturnValue(mockUserAccess);

describe('getUserRoles', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('getUserRoles returns the correct user roles', async () => {
    const filteredUsers = mockGetExperimentUsersResults.filter(
      (user) => user.accessRole === AccessRole.ADMIN,
    );

    const result = await getExperimentUsers(experimentId);

    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledWith(experimentId);
    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledTimes(1);

    // Only filtered users should be fetched for data
    expect(getUser).toHaveBeenCalledTimes(filteredUsers.length);
    expect(getUser).toHaveBeenCalledTimes(filteredUsers.length);

    expect(result).toMatchSnapshot();
  });

  it('getUserRoles ignores if there is an error fetching Cognito user data', async () => {
    getUser.mockReturnValueOnce(Promise.reject(new Error('Error fetching user data')));

    await expect(getExperimentUsers(experimentId)).resolves.toEqual([]);

    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledWith(experimentId);
    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledTimes(1);
  });
});
