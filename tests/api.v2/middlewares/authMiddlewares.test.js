// @ts-nocheck
const {
  expressAuthorizationMiddleware,
  authorize,
  expressAuthenticationOnlyMiddleware,
  checkAuthExpiredMiddleware,
} = require('../../../src/api.v2/middlewares/authMiddlewares');

const { UnauthorizedError, UnauthenticatedError } = require('../../../src/utils/responses');
const NotAgreedToTermsError = require('../../../src/utils/responses/NotAgreedToTermsError');
const fake = require('../../test-utils/constants');

const UserAccessModel = require('../../../src/api.v2/model/UserAccess')();

jest.mock('../../../src/api.v2/model/UserAccess');

describe('Tests for authorization/authentication middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Authorized user can proceed', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const result = await authorize(fake.USER.sub, 'sockets', null, fake.EXPERIMENT_ID);
    expect(result).toEqual(true);
  });

  it('Unauthorized user cannot proceed', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => false);

    await expect(authorize(fake.USER.sub, 'sockets', null, fake.EXPERIMENT_ID)).rejects;
  });

  it('Express middleware can authorize correct users', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: {
        sub: 'allowed-user-id',
        'custom:agreed_terms': 'true',
      },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalled();

    expect(UserAccessModel.canAccessExperiment).toHaveBeenCalledWith(
      'allowed-user-id',
      fake.EXPERIMENT_ID,
      '/v2/experiments',
      'POST',
    );
  });

  it('Express middleware can reject incorrect users', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => false);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: {
        sub: 'allowed-user-id',
        'custom:agreed_terms': 'true',
      },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalledWith(expect.any(UnauthorizedError));

    expect(UserAccessModel.canAccessExperiment).toHaveBeenCalledWith(
      'allowed-user-id',
      fake.EXPERIMENT_ID,
      '/v2/experiments',
      'POST',
    );
  });

  it('Express middleware can reject unauthenticated requests', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });

  it('Express middleware can reject users that didnt agree to privacy policy', async () => {
    UserAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      url: fake.RESOURCE_V2,
      user: {
        sub: 'allowed-user-id',
      },
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(NotAgreedToTermsError));
  });

  it('expressAuthenticationOnlyMiddleware works correctly', async () => {
    const next = jest.fn();
    const req = { user: { sub: 'someuserid-xd-123' } };
    await expressAuthenticationOnlyMiddleware(req, {}, next);
    expect(next).toBeCalled();
  });

  it('expressAuthenticationOnlyMiddleware should fail if req.user is empty', async () => {
    const next = jest.fn();
    const req = { user: null };
    await expect(expressAuthenticationOnlyMiddleware(req, {}, next)).rejects;
  });

  it('checkAuth accepts expired tokens for patch cellsets', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.USER,
      url: `/v1/experiments/${fake.EXPERIMENT_ID}/cellSets`,
      method: 'PATCH',
      ip: '::ffff:127.0.0.1',
    };
    const next = jest.fn();

    const ret = checkAuthExpiredMiddleware(req, {}, next);
    expect(ret).toBe(null);
  });

  it('Express middleware can reject unauthenticated requests', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });
  it('expressAuthenticationOnlyMiddleware should fail if privacy policy wasnt agreed on', async () => {
    const next = jest.fn();
    const req = { user: { sub: 'someuserid-xd-123' } };

    await expressAuthenticationOnlyMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(NotAgreedToTermsError));
  });
});
