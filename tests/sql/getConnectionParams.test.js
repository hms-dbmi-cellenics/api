const AWS = require('../../src/utils/requireAWS');

const config = require('../../src/config');

const getConnectionParams = require('../../src/sql/getConnectionParams');

jest.mock('../../src/config');

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

describe('getConnectionParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Creates correct params in development environment', async () => {
    config.awsRegion = 'eu-west-1';

    const signerSpy = jest.fn((x) => x);

    const params = await getConnectionParams('development');

    // Doesn't call the aws signer because we aren't interacting with aws
    expect(signerSpy).not.toHaveBeenCalled();

    // Creates a connection with the correct parameters
    expect(params).toEqual(localhostParams);
  });

  it('Creates correct params in staging environment', async () => {
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    const params = await getConnectionParams('staging');

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
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    const params = await getConnectionParams('production');

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
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints
      .mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    await expect(getConnectionParams('staging')).rejects.toThrow();

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(mockGetAuthTokenSpy).not.toHaveBeenCalled();
  });
});
