// @ts-nocheck
const {
  expressAuthorizationMiddleware,
  authorize,
} = require('../../../src/api.v2/middlewares/authMiddlewares');

const { UnauthorizedError, UnauthenticatedError } = require('../../../src/utils/responses');
const fake = require('../../test-utils/constants');

const userAccessModel = require('../../../src/api.v2/model/userAccess');

jest.mock('../../../src/api.v2/model/userAccess');

describe('Tests for authorization/authentication middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Authorized user can proceed', async () => {
    userAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const result = await authorize(fake.USER.sub, 'sockets', null, fake.EXPERIMENT_ID);
    expect(result).toEqual(true);
  });

  it('Unauthorized user cannot proceed', async () => {
    userAccessModel.canAccessExperiment.mockImplementationOnce(() => false);

    await expect(authorize(fake.USER.sub, 'sockets', null, fake.EXPERIMENT_ID)).rejects;
  });

  it('Express middleware can authorize correct users', async () => {
    userAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: { sub: 'allowed-user-id' },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalled();

    expect(userAccessModel.canAccessExperiment).toHaveBeenCalledWith(
      'allowed-user-id',
      'experimentid11111111111111111111',
      '/v2/experiments',
      'POST',
    );
  });

  it('Express middleware can reject incorrect users', async () => {
    userAccessModel.canAccessExperiment.mockImplementationOnce(() => false);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: { sub: 'allowed-user-id' },
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalledWith(expect.any(UnauthorizedError));

    expect(userAccessModel.canAccessExperiment).toHaveBeenCalledWith(
      'allowed-user-id',
      'experimentid11111111111111111111',
      '/v2/experiments',
      'POST',
    );
  });

  it('Express middleware can reject unauthenticated requests', async () => {
    userAccessModel.canAccessExperiment.mockImplementationOnce(() => true);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      url: fake.RESOURCE_V1,
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });
});
