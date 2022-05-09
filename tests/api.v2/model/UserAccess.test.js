// @ts-nocheck
const roles = require('../../../src/api.v2/helpers/roles');

const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/helpers/roles');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));
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

const mockUserId = '1234-5678-9012-3456';
const mockExperimentId = 'experimentId';
const mockRole = 'mockRole';

const mockUserAccessCreateResults = [
  [{
    userId: 'mockAdminSub',
    experimentId: mockExperimentId,
    accessRole: AccessRole.OWNER,
    updatedAt: '1910-03-23 21:06:00.573142+00',
  }],
  [{
    userId: mockUserId,
    experimentId: mockExperimentId,
    accessRole: AccessRole.OWNER,
    updatedAt: '1910-03-23 21:06:00.573142+00',
  }],
];

const mockGetUserAccessResults = [
  {
    userId: 'mockAdminSub',
    experimentId: mockExperimentId,
    accessRole: AccessRole.ADMIN,
    updatedAt: '1910-03-23 21:06:00.573142+00',
  },
  {
    userId: mockUserId,
    experimentId: mockExperimentId,
    accessRole: 'owner',
    updatedAt: '1910-03-23 21:06:00.573142+00',
  },
];

describe('model/userAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getUserAccess work correctly', async () => {
    const experimentId = 'experimentId';

    const mockFind = jest.spyOn(BasicModel.prototype, 'find')
      .mockImplementationOnce(() => Promise.resolve(mockGetUserAccessResults));

    const result = await new UserAccess().getExperimentUsers(experimentId);

    expect(mockFind).toHaveBeenCalledWith({ experiment_id: experimentId });
    expect(mockFind).toHaveBeenCalledTimes(1);

    expect(result).toMatchSnapshot();
  });

  it('getUserAccess throws a not found error if experiment does not exist', async () => {
    const experimentId = 'experimentId';

    const mockFind = jest.spyOn(BasicModel.prototype, 'find')
      .mockImplementationOnce(() => Promise.resolve([]));

    await expect(
      new UserAccess().getExperimentUsers(experimentId),
    ).rejects.toThrow('Experiment not found');

    expect(mockFind).toHaveBeenCalledWith({ experiment_id: experimentId });
    expect(mockFind).toHaveBeenCalledTimes(1);
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
    const userId = 'userId';
    const experimentId = 'experimentId';

    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]))
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[1]]));

    await new UserAccess().createNewExperimentPermissions(userId, experimentId);

    expect(mockCreate).toHaveBeenCalledWith({ access_role: 'admin', experiment_id: 'experimentId', user_id: 'mockAdminSub' });
    expect(mockCreate).toHaveBeenCalledWith({ access_role: 'owner', experiment_id: 'experimentId', user_id: 'userId' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('createNewExperimentPermissions works correctly when creator is admin', async () => {
    const userId = 'mockAdminSub';
    const experimentId = 'experimentId';

    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]));

    await new UserAccess().createNewExperimentPermissions(userId, experimentId);

    expect(mockCreate).toHaveBeenCalledWith({ access_role: 'admin', experiment_id: 'experimentId', user_id: 'mockAdminSub' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('createNewExperimentPermissions fails if admin creation failed', async () => {
    const userId = 'userId';
    const experimentId = 'experimentId';

    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.reject(new Error('A happy sql error :)')));

    await expect(new UserAccess().createNewExperimentPermissions(userId, experimentId)).rejects.toThrow('A happy sql error :)');

    expect(mockCreate).toHaveBeenCalledWith({ access_role: 'admin', experiment_id: 'experimentId', user_id: 'mockAdminSub' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('createNewExperimentPermissions fails if owner creation failed', async () => {
    const userId = 'userId';
    const experimentId = 'experimentId';

    const mockCreate = jest.spyOn(BasicModel.prototype, 'create')
      .mockImplementationOnce(() => Promise.resolve([mockUserAccessCreateResults[0]]))
      .mockImplementationOnce(() => Promise.reject(new Error('A happy sql error :)')));

    await expect(new UserAccess().createNewExperimentPermissions(userId, experimentId)).rejects.toThrow('A happy sql error :)');

    expect(mockCreate).toHaveBeenCalledWith({ access_role: 'admin', experiment_id: 'experimentId', user_id: 'mockAdminSub' });
    expect(mockCreate).toHaveBeenCalledWith({ access_role: 'owner', experiment_id: 'experimentId', user_id: 'userId' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('canAccessExperiment allows access if an entry exists and isRoleAuthorized allows', async () => {
    const userId = 'userId';
    const experimentId = 'experimentId';
    const url = 'url';
    const method = 'method';

    mockSqlClient.from.mockImplementationOnce(() => ({ accessRole: 'roleThatIsOk' }));

    roles.isRoleAuthorized.mockImplementationOnce(() => true);

    const result = await new UserAccess().canAccessExperiment(userId, experimentId, url, method);


    expect(mockSqlClient.first).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith(
      { experiment_id: experimentId, user_id: userId },
    );

    expect(roles.isRoleAuthorized).toHaveBeenCalledWith('roleThatIsOk', url, method);
    expect(result).toEqual(true);
  });

  it('canAccessExperiment denies access if no entry exists', async () => {
    const userId = 'userId';
    const experimentId = 'experimentId';
    const url = 'url';
    const method = 'method';

    mockSqlClient.from.mockImplementationOnce(() => undefined);

    const result = await new UserAccess().canAccessExperiment(userId, experimentId, url, method);

    expect(mockSqlClient.first).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith(
      { experiment_id: experimentId, user_id: userId },
    );

    expect(roles.isRoleAuthorized).not.toHaveBeenCalled();

    expect(result).toEqual(false);
  });

  it('canAccessExperiment denies access if an entry exists but the role doesn\'t allow this kind of access', async () => {
    const userId = 'userId';
    const experimentId = 'experimentId';
    const url = 'url';
    const method = 'method';

    mockSqlClient.from.mockImplementationOnce(() => ({ accessRole: 'roleThatIsNotOk' }));

    roles.isRoleAuthorized.mockImplementationOnce(() => false);

    const result = await new UserAccess().canAccessExperiment(userId, experimentId, url, method);

    expect(mockSqlClient.first).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith(
      { experiment_id: experimentId, user_id: userId },
    );

    expect(roles.isRoleAuthorized).toHaveBeenCalledWith('roleThatIsNotOk', url, method);

    expect(result).toEqual(false);
  });
});
