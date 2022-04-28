// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const config = require('../../../../src/config');

const UserAccess = require('../../../../src/api.v2/model/UserAccess');

const AccessRole = require('../../../../src/utils/enums/AccessRole');

const getUserRoles = require('../../../../src/api.v2/helpers/access/getUserRoles');

const { cognitoISP } = config;

jest.mock('../../../../src/config', () => ({
  awsUserPoolIdPromise: Promise.resolve('mockUserPoolId'),
  cognitoISP: {
    adminGetUser: jest.fn(({ Username }) => ({
      promise: () => Promise.resolve({
        UserAttributes: [
          { Name: 'name', Value: `${Username}-test` },
          { Name: 'email', Value: `${Username}@example.com` },
        ],
      }),
    })),
  },
}));

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

    const result = await getUserRoles(experimentId);

    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledWith(experimentId);
    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledTimes(1);

    // Only filtered users should be fetched for data
    expect(cognitoISP.adminGetUser).toHaveBeenCalledTimes(filteredUsers.length);

    expect(result).toMatchSnapshot();
  });

  it('getUserRoles throws a server error if there is an error fetching Cognito user data', async () => {
    cognitoISP.adminGetUser.mockReturnValueOnce(Promise.reject(new Error('Error fetching user data')));

    await expect(getUserRoles(experimentId)).rejects.toThrow();

    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledWith(experimentId);
    expect(mockUserAccess.getExperimentUsers).toHaveBeenCalledTimes(1);
  });
});
