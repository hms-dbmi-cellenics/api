const AWS = require('../../src/utils/requireAWS');

const getConnectionParams = require('../../src/sql/getConnectionParams');

const mockDescribeDBClusterEndpoints = jest.fn();
jest.mock('../../src/utils/requireAWS', () => ({
  config: {
    credentials: { expired: false },
  },
  RDS: jest.fn(() => ({
    describeDBClusterEndpoints: mockDescribeDBClusterEndpoints,
  })),
}));

const mockGetAuthTokenSpy = jest.fn();
AWS.RDS.Signer = jest.fn(() => ({
  getAuthToken: mockGetAuthTokenSpy,
}));

const localhostParams = {
  host: 'localhost',
  port: 5431,
  user: 'postgres',
  database: 'aurora_db',
};

const rdsParams = {
  host: 'endpointName',
  port: 5432,
  user: 'api_role',
  password: 'passwordToken', // pragma: allowlist secret
  database: 'aurora_db',
  ssl: { rejectUnauthorized: false },
  expirationChecker: expect.any(Function),
};

const testSandboxId = 'test';

describe('getConnectionParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Creates correct params in development environment', async () => {
    const signerSpy = jest.fn((x) => x);

    const params = await getConnectionParams('development', testSandboxId);

    // Doesn't call the aws signer because we aren't interacting with aws
    expect(signerSpy).not.toHaveBeenCalled();

    // Creates a connection with the correct parameters
    expect(params).toEqual(localhostParams);
  });

  it('Creates correct params in staging environment', async () => {
    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockImplementation((params, callback) => {
      callback(null, 'passwordToken');
    });

    const params = await getConnectionParams('staging', testSandboxId);

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(AWS.RDS.Signer).toHaveBeenCalledWith({
      hostname: 'endpointName',
      region: 'eu-west-1',
      port: 5432,
      username: 'api_role',
    });

    expect(mockGetAuthTokenSpy).toHaveBeenCalled();

    expect(params).toEqual(rdsParams);
  });

  it('Creates correct params in production environment', async () => {
    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockImplementation((params, callback) => {
      callback(null, 'passwordToken');
    });

    const params = await getConnectionParams('production', testSandboxId);

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(AWS.RDS.Signer).toHaveBeenCalledWith({
      hostname: 'endpointName',
      region: 'eu-west-1',
      port: 5432,
      username: 'api_role',
    });

    expect(mockGetAuthTokenSpy).toHaveBeenCalled();

    expect(params).toEqual(rdsParams);
  });

  it('Fails if there is no writer endpoint available', async () => {
    mockDescribeDBClusterEndpoints
      .mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [] }) });

    mockGetAuthTokenSpy.mockImplementation((params, callback) => {
      callback(null, 'passwordToken');
    });

    await expect(getConnectionParams('staging', testSandboxId)).rejects.toThrow();

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(mockGetAuthTokenSpy).not.toHaveBeenCalled();
  });
});
