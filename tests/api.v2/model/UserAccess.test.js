// @ts-nocheck
const roles = require('../../../src/api.v2/helpers/roles');

const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/helpers/roles');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const BasicModel = require('../../../src/api.v2/model/BasicModel');

const UserAccess = require('../../../src/api.v2/model/UserAccess');

const mockUserAccessCreateResults = [
  [{
    userId: 'mockAdminSub',
    experimentId: 'mockExperimentId',
    accessRole: 'owner',
    updatedAt: '1910-03-23 21:06:00.573142+00',
  }],
  [{
    userId: 'someUser',
    experimentId: 'mockExperimentId',
    accessRole: 'owner',
    updatedAt: '1910-03-23 21:06:00.573142+00',
  }],
];

describe('model/userAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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