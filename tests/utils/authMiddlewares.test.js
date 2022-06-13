const AWSMock = require('aws-sdk-mock');

const {
  checkAuthExpiredMiddleware,
  expressAuthorizationMiddleware,
  authorize,
  expressAuthenticationOnlyMiddleware,
} = require('../../src/utils/authMiddlewares');
const { UnauthorizedError, UnauthenticatedError, MaintenanceModeError } = require('../../src/utils/responses');
const fake = require('../test-utils/constants');

const {
  mockDynamoGetItem,
  mockDynamoBatchGetItem,
} = require('../test-utils/mockAWSServices');

describe('Tests for authorization/authentication middlewares', () => {
  // Sample experiment permission data.
  const data = {
    experimentId: fake.EXPERIMENT_ID,
    projectUuid: '23456',
    userId: fake.DEV_USER.sub,
    role: 'owner',
  };

  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  it('Authorized user can proceed', async () => {
    mockDynamoGetItem(data);

    const result = await authorize(fake.DEV_USER.sub, 'sockets', null, fake.EXPERIMENT_ID);
    expect(result).toEqual(true);
  });

  it('Unauthorized user cannot proceed', async () => {
    mockDynamoGetItem(data);

    await expect(authorize(fake.DEV_USER.sub, 'sockets', null, fake.EXPERIMENT_ID)).rejects;
  });

  it('Express middleware can authorize correct users', async () => {
    mockDynamoGetItem(data);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.DEV_USER,
      url: fake.RESOURCE_V1,
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith();
  });

  it('expressAuthorizationMiddleware can reject normal users in maintenance mode', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.USER,
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);

    expect(next).toBeCalledWith(expect.any(MaintenanceModeError));
  });

  it('expressAuthenticationOnlyMiddleware can reject normal users in maintenance mode', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.USER,
      url: fake.RESOURCE_V2,
      method: 'POST',
    };

    const next = jest.fn();

    await expressAuthenticationOnlyMiddleware(req, {}, next);

    expect(next).toBeCalledWith(expect.any(MaintenanceModeError));
  });

  it('checkAuth accepts expired tokens for patch cellsets', async () => {
    mockDynamoGetItem(data);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.DEV_USER,
      url: `/v1/experiments/${fake.EXPERIMENT_ID}/cellSets`,
      method: 'PATCH',
      ip: '::ffff:127.0.0.1',
    };
    const next = jest.fn();

    const ret = checkAuthExpiredMiddleware(req, {}, next);
    expect(ret).toBe(null);
  });

  it('Express middleware can reject incorrect users', async () => {
    mockDynamoGetItem({});

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.DEV_USER,
      url: fake.RESOURCE_V1,
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthorizedError));
  });

  it('Express middleware can reject unauthenticated requests', async () => {
    mockDynamoGetItem(data);

    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      url: fake.RESOURCE_V1,
      method: 'POST',
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });

  it('Express middleware can resolve using authorization using projectUuid', async () => {
    mockDynamoBatchGetItem({
      Responses: {
        'experiments-test': [data],
      },
    });

    const req = {
      params: { projectUuid: '23456' },
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });

  it('Express middleware with unknown projectUuid will throw unauth error', async () => {
    mockDynamoBatchGetItem({
      Responses: {
        'experiments-test': [data],
      },
    });

    const req = {
      params: { projectUuid: '2345' },
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });
});
