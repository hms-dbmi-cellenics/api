const AWS = require('aws-sdk');

const config = require('../../src/config');

const getRDSParams = require('../../src/SQL/getRDSParams');

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

const rdsParams = {
  host: 'endpointName',
  port: 5432,
  user: 'api_role',
  password: 'passwordToken', // pragma: allowlist secret
  database: 'aurora_db',
  ssl: { rejectUnauthorized: false },
  pool: {
    max: 10,
    min: 2,
  },
  expirationChecker: expect.any(Function),
};

describe('createSQLClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Establishes a connection in staging environment', async () => {
    config.clusterEnv = 'staging';
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    const params = await getRDSParams();

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

    await expect(getRDSParams()).rejects.toThrow();

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(mockGetAuthTokenSpy).not.toHaveBeenCalled();
  });
});
