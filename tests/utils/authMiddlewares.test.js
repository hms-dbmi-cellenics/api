const AWSMock = require('aws-sdk-mock');
const AWS = require('../../src/utils/requireAWS');
const {
  expressAuthorizationMiddleware,
  authorize,
} = require('../../src/utils/authMiddlewares');
const { UnauthorizedError, UnauthenticatedError } = require('../../src/utils/responses');

const {
  mockDynamoGetItem,
  mockDynamoBatchGetItem,
} = require('../test-utils/mockAWSServices');

const documentClient = new AWS.DynamoDB.DocumentClient();

describe('Tests for authorization/authentication middlewares', () => {
  // Sample experiment permission data.
  const data = {
    experimentId: '12345',
    projectId: '23456',
    rbac_can_write: documentClient.createSet(['test-user']),
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
