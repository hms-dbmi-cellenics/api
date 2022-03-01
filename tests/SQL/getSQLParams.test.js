const AWS = require('aws-sdk');

const config = require('../../src/config');

const getConnectionParams = require('../../src/SQL/getConnectionParams');

jest.mock('../../src/config');

const mockDescribeDBClusterEndpoints = jest.fn();
jest.mock('aws-sdk', () => ({
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
  host: '127.0.0.1',
  port: 5432,
  user: 'api_role',
  password: 'postgres', // pragma: allowlist secret
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

describe('createSQLClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Establishes a connection in development environment', async () => {
    config.clusterEnv = 'development';
    config.awsRegion = 'eu-west-1';

    const signerSpy = jest.fn((x) => x);

    const params = await getConnectionParams();

    // Doesn't call the aws signer because we aren't interacting with aws
    expect(signerSpy).not.toHaveBeenCalled();

    // Creates a connection with the correct parameters
    expect(params).toEqual(localhostParams);
  });

  it('Establishes a connection in staging environment', async () => {
    config.clusterEnv = 'staging';
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    const params = await getConnectionParams();

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

  it('Establishes a connection in staging environment', async () => {
    config.clusterEnv = 'staging';
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    const params = await getConnectionParams();

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
    config.clusterEnv = 'staging';
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints
      .mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    await expect(getConnectionParams()).rejects.toThrow();

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(mockGetAuthTokenSpy).not.toHaveBeenCalled();
  });
});
