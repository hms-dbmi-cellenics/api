// @ts-nocheck
const roles = require('../../../src/api.v2/helpers/roles');

const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

// const mockIsRoleAuthorized = jest.fn();
jest.mock('../../../src/api.v2/helpers/roles');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const userAccess = require('../../../src/api.v2/model/userAccess');

describe('model/userAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(userAccess).toEqual(
      expect.objectContaining({
        hasFakeBasicModelFunctions: true,
      }),
    );
  });

  it('canAccessExperiment allows access if an entry exists and isRoleAuthorized allows', async () => {
    const userId = 'userId';
    const experimentId = 'experimentId';
    const url = 'url';
    const method = 'method';

    mockSqlClient.from.mockImplementationOnce(() => ({ access_role: 'roleThatIsOk' }));

    // @ts-ignore
    roles.isRoleAuthorized.mockImplementationOnce(() => true);

    const result = await userAccess.canAccessExperiment(userId, experimentId, url, method);

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

    const result = await userAccess.canAccessExperiment(userId, experimentId, url, method);

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

    mockSqlClient.from.mockImplementationOnce(() => ({ access_role: 'roleThatIsNotOk' }));

    // @ts-ignore
    roles.isRoleAuthorized.mockImplementationOnce(() => false);

    const result = await userAccess.canAccessExperiment(userId, experimentId, url, method);

    expect(mockSqlClient.first).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith(
      { experiment_id: experimentId, user_id: userId },
    );

    expect(roles.isRoleAuthorized).toHaveBeenCalledWith('roleThatIsNotOk', url, method);

    expect(result).toEqual(false);
  });
});
