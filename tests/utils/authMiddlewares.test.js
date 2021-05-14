const AWSMock = require('aws-sdk-mock');
const {
  expressAuthorizationMiddleware,
  authorize,
} = require('../../src/utils/authMiddlewares');
const { UnauthorizedError, UnauthenticatedError } = require('../../src/utils/responses');

const {
  mockDynamoGetItem,
} = require('../test-utils/mockAWSServices');

describe('Tests for authorization/authentication middlewares', () => {
  // Sample experiment permission data.
  const data = {
    experimentId: '12345',
    rbac_can_write: ['test-user'],
  };

  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  it('Authorized user can proceed', async () => {
    mockDynamoGetItem(data);

    const mockClaim = {
      'cognito:username': 'test-user',
      email: 'test@user.net',
    };

    const result = await authorize('12345', mockClaim);
    expect(result).toEqual(true);
  });

  it('Unauthorized user cannot proceed', async () => {
    mockDynamoGetItem(data);

    const mockClaim = {
      'cognito:username': 'test-user-invalid',
      email: 'test@user.net',
    };

    await expect(authorize('12345', mockClaim)).rejects;
  });

  it('Express middleware can authorize correct users', async () => {
    mockDynamoGetItem(data);

    const mockClaim = {
      'cognito:username': 'test-user',
      email: 'test@user.net',
    };
    const req = {
      params: { experimentId: '1234' },
      user: mockClaim,
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith();
  });

  it('Express middleware can reject incorrect users', async () => {
    mockDynamoGetItem(data);

    const mockClaim = {
      'cognito:username': 'test-user-invalid',
      email: 'test@user.net',
    };
    const req = {
      params: { experimentId: '1234' },
      user: mockClaim,
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthorizedError));
  });

  it('Express middleware can reject unauthenticated requests', async () => {
    mockDynamoGetItem(data);

    const req = {
      params: { experimentId: '1234' },
    };
    const next = jest.fn();

    await expressAuthorizationMiddleware(req, {}, next);
    expect(next).toBeCalledWith(expect.any(UnauthenticatedError));
  });
});
