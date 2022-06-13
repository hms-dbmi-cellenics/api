// @ts-nocheck
const {
  expressAuthorizationMiddleware,
  authorize,
  expressAuthenticationOnlyMiddleware,
} = require('../../../src/api.v2/middlewares/authMiddlewares');

const { UnauthorizedError, UnauthenticatedError, MaintenanceModeError } = require('../../../src/utils/responses');
const fake = require('../../test-utils/constants');

const UserAccessModel = require('../../../src/api.v2/model/UserAccess')();

jest.mock('../../../src/api.v2/model/UserAccess');

describe('Tests for authorization/authentication middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Authorized user can proceed', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const result = await authorize(fake.DEV_USER.sub, 'sockets', null, fake.EXPERIMENT_ID);
    expect(result).toEqual(true);
  });

  it('Unauthorized user cannot proceed', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => false);

    await expect(authorize(fake.DEV_USER.sub, 'sockets', null, fake.EXPERIMENT_ID)).rejects;
  });

  it('Express middleware can authorize correct users', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: { email: fake.DEV_USER.email, sub: 'allowed-user-id' },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalled();

    expect(UserAccessModel.canAccessExperiment).toHaveBeenCalledWith(
      'allowed-user-id',
      'experimentid11111111111111111111',
      '/v2/experiments',
      'POST',
    );
  });

  it('Express middleware can reject incorrect users', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => false);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: { email: fake.DEV_USER.email, sub: 'allowed-user-id' },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalledWith(expect.any(UnauthorizedError));

    expect(UserAccessModel.canAccessExperiment).toHaveBeenCalledWith(
      'allowed-user-id',
      'experimentid11111111111111111111',
      '/v2/experiments',
      'POST',
    );
  });

  it('Express middleware can reject normal users in maintenance mode', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: { email: fake.USER.email, sub: 'allowed-user-id' },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalledWith(expect.any(MaintenanceModeError));

    expect(UserAccessModel.canAccessExperiment).not.toHaveBeenCalled();
  });

  it('Express middleware can reject unauthenticated requests', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      url: fake.RESOURCE_V1,
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });

  it('expressAuthenticationOnlyMiddleware works correctly', async () => {
    const next = jest.fn();
    const req = { user: 'someuserid-xd-123' };
    await expressAuthenticationOnlyMiddleware(req, {}, next);
    expect(next).toBeCalled();
  });
  it('expressAuthenticationOnlyMiddleware should fail if req.user is empty', async () => {
    const next = jest.fn();
    const req = { user: null };
    await expect(expressAuthenticationOnlyMiddleware(req, {}, next)).rejects;
  });
});
