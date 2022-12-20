// @ts-nocheck
const roles = require('../../../src/api.v2/helpers/roles');

const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/helpers/roles');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));
jest.mock('../../../src/utils/getAdminSub');
jest.mock('../../../src/utils/aws/user', () => ({
  getAwsUserAttributesByEmail: jest.fn((userId) => Promise.resolve(
    [
      { Name: 'sub', Value: userId },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: `${userId}-name` },
      { Name: 'email', Value: `${userId}@example.com` },
    ],
  )),
}));

const BasicModel = require('../../../src/api.v2/model/BasicModel');
const UserAccess = require('../../../src/api.v2/model/UserAccess');
const AccessRole = require('../../../src/utils/enums/AccessRole');
const constants = require('../../../src/utils/constants');

const mockAdminUserId = 'mockAdminSub';
const mockUserId = '1234-5678-9012-1234';
const mockUserEmail = `${mockUserId}@example.com`;
const mockExperimentId = 'experimentId';
const mockRole = 'mockRole';

const mockUserAccessCreateResults = [
  [{
    userId: mockAdminUserId,
    experimentId: mockExperimentId,
    accessRole: AccessRole.ADMIN,
    updatedAt: '1910-03-23 21:06:00.573142+00',
  }],
  [{
    userId: mockUserId,
    experimentId: mockExperimentId,
    accessRole: AccessRole.OWNER,
    updatedAt: '1910-03-23 21:06:00.573142+00',
  }],
];

const mockGetExperimentUsersResults = [
  {
    userId: mockAdminUserId,
    experimentId: mockExperimentId,
    accessRole: AccessRole.ADMIN,
    updatedAt: '1910-03-23 21:06:00.573142+00',
  },
  {
    userId: mockUserId,
    experimentId: mockExperimentId,
    accessRole: AccessRole.OWNER,
    updatedAt: '1910-03-23 21:06:00.573142+00',
  },
];

describe('model/userAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getExperimentUsers work correctly', async () => {
    const mockFind = jest.spyOn(BasicModel.prototype, 'find')
      .mockImplementationOnce(() => Promise.resolve(mockGetExperimentUsersResults));

    const result = await new UserAccess().getExperimentUsers(mockExperimentId);

    expect(mockFind).toHaveBeenCalledWith({ experiment_id: mockExperimentId });
    expect(mockFind).toHaveBeenCalledTimes(1);

    expect(result).toMatchSnapshot();
  });

  it('getExperimentUsers throws a not found error if experiment does not exist', async () => {
    const mockFind = jest.spyOn(BasicModel.prototype, 'find')
      .mockImplementationOnce(() => Promise.resolve([]));

    await expect(
      new UserAccess().getExperimentUsers(mockExperimentId),
    ).rejects.toThrow('Experiment not found');

    expect(mockFind).toHaveBeenCalledWith({ experiment_id: mockExperimentId });
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it('addToInvite access works correctly', async () => {
    await new UserAccess().addToInviteAccess(mockUserEmail, mockUserId, mockRole);

    expect(mockSqlClient.insert.mock.calls).toMatchSnapshot('insertParams');
    expect(mockSqlClient.into.mock.calls).toMatchSnapshot('intoParams');
  });

  it('registerNewUserAccess access works correctly', async () => {
    const mockInvitation = [{
      experiment_id: 'mockExperiment1',
      access_role: mockRole,
    },
    {
      user_id: 'mockExperiment2',
      access_role: mockRole,
    }];

    mockSqlClient.where.mockImplementationOnce(() => mockInvitation);

    await new UserAccess().registerNewUserAccess(mockUserEmail, mockUserId);

    // Gets the correct invitation access
    expect(mockSqlClient.select.mock.calls[0]).toMatchSnapshot('selectParams');
    expect(mockSqlClient.from.mock.calls[0]).toMatchSnapshot('fromParams');
    expect(mockSqlClient.where.mock.calls[0]).toMatchSnapshot('whereParams');

    // Inserts the user records
    expect(mockSqlClient.insert.mock.calls[0]).toMatchSnapshot('insertParams');

    // Deletes the invitation record
    expect(mockSqlClient.del).toHaveBeenCalledTimes(1);
    expect(mockSqlClient.from.mock.calls[1]).toMatchSnapshot('fromParams');
    expect(mockSqlClient.where.mock.calls[1]).toMatchSnapshot('whereParams');
  });

  it('grantAccess work correctly', async () => {
    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.resolve());

    await expect(
      new UserAccess().grantAccess(mockUserId, mockExperimentId, mockRole),
    );

    expect(mockCreate).toHaveBeenCalledWith({
      user_id: mockUserId,
      experiment_id: mockExperimentId,
      access_role: mockRole,
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('removeAccess work correctly', async () => {
    const mockDelete = jest.spyOn(BasicModel.prototype, 'delete')
      .mockImplementationOnce(() => Promise.resolve());

    await new UserAccess().removeAccess(mockUserId, mockExperimentId);

    expect(mockDelete).toHaveBeenCalledWith({
      user_id: mockUserId,
      experiment_id: mockExperimentId,
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('createNewExperimentPermissions works correctly', async () => {
    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]))
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[1]]));

    await new UserAccess().createNewExperimentPermissions(mockUserId, mockExperimentId);

    expect(mockCreate).toHaveBeenCalledWith({ access_role: roles.ADMIN, experiment_id: mockExperimentId, user_id: mockAdminUserId });
    expect(mockCreate).toHaveBeenCalledWith({ access_role: roles.OWNER, experiment_id: mockExperimentId, user_id: mockUserId });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('createNewExperimentPermissions works correctly when creator is admin', async () => {
    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]));

    await new UserAccess().createNewExperimentPermissions(mockAdminUserId, mockExperimentId);

    expect(mockCreate).toHaveBeenCalledWith({ access_role: roles.ADMIN, experiment_id: mockExperimentId, user_id: mockAdminUserId });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('createNewExperimentPermissions fails if admin creation failed', async () => {
    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.reject(new Error('A happy sql error :)')));

    await expect(new UserAccess().createNewExperimentPermissions(mockUserId, mockExperimentId)).rejects.toThrow('A happy sql error :)');

    expect(mockCreate).toHaveBeenCalledWith({ access_role: roles.ADMIN, experiment_id: mockExperimentId, user_id: mockAdminUserId });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('createNewExperimentPermissions fails if owner creation failed', async () => {
    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]))
      .mockImplementationOnce(() => Promise.reject(new Error('A happy sql error :)')));

    await expect(new UserAccess().createNewExperimentPermissions(mockUserId, mockExperimentId)).rejects.toThrow('A happy sql error :)');

    expect(mockCreate).toHaveBeenCalledWith({ access_role: roles.ADMIN, experiment_id: mockExperimentId, user_id: mockAdminUserId });
    expect(mockCreate).toHaveBeenCalledWith({ access_role: roles.OWNER, experiment_id: mockExperimentId, user_id: mockUserId });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('canAccessExperiment allows access if an entry exists and isRoleAuthorized allows', async () => {
    const url = 'url';
    const method = 'method';

    mockSqlClient.first.mockImplementationOnce(() => ({ accessRole: 'roleThatIsOk' }));

    roles.isRoleAuthorized.mockImplementationOnce(() => true);

    const result = await new UserAccess()
      .canAccessExperiment(mockUserId, mockExperimentId, url, method);

    expect(mockSqlClient.first).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith(
      { experiment_id: mockExperimentId, user_id: mockUserId },
    );
    expect(mockSqlClient.orWhere).toHaveBeenCalledWith(
      { experiment_id: mockExperimentId, user_id: constants.PUBLIC_ACCESS_ID },
    );

    expect(roles.isRoleAuthorized).toHaveBeenCalledWith('roleThatIsOk', url, method);
    expect(result).toEqual(true);
  });

  it('canAccessExperiment denies access if no entry exists', async () => {
    const url = 'url';
    const method = 'method';

    mockSqlClient.first.mockImplementationOnce(() => undefined);

    const result = await new UserAccess().canAccessExperiment(mockUserId, mockExperimentId, url, method);

    expect(mockSqlClient.first).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith(
      { experiment_id: mockExperimentId, user_id: mockUserId },
    );
    expect(mockSqlClient.orWhere).toHaveBeenCalledWith(
      { experiment_id: mockExperimentId, user_id: constants.PUBLIC_ACCESS_ID },
    );

    expect(roles.isRoleAuthorized).not.toHaveBeenCalled();

    expect(result).toEqual(false);
  });

  it('canAccessExperiment denies access if an entry exists but the role doesn\'t allow this kind of access', async () => {
    const url = 'url';
    const method = 'method';

    mockSqlClient.first.mockImplementationOnce(() => ({ accessRole: 'roleThatIsNotOk' }));

    roles.isRoleAuthorized.mockImplementationOnce(() => false);

    const result = await new UserAccess().canAccessExperiment(mockUserId, mockExperimentId, url, method);

    expect(mockSqlClient.first).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith(
      { experiment_id: mockExperimentId, user_id: mockUserId },
    );
    expect(mockSqlClient.orWhere).toHaveBeenCalledWith(
      { experiment_id: mockExperimentId, user_id: constants.PUBLIC_ACCESS_ID },
    );

    expect(roles.isRoleAuthorized).toHaveBeenCalledWith('roleThatIsNotOk', url, method);

    expect(result).toEqual(false);
  });
});
