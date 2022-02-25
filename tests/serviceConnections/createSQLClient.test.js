const knex = require('knex');

const AWS = require('aws-sdk');

const config = require('../../src/config');

const createSQLClient = require('../../src/serviceConnections/createSQLClient');

jest.mock('../../src/config');
jest.mock('knex', () => ({ default: jest.fn() }));

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
};

describe('createSQLClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Establishes a connection in development environment', () => {
    config.clusterEnv = 'development';
    config.awsRegion = 'eu-west-1';

    const signerSpy = jest.fn((x) => x);

    createSQLClient();

    // Doesn't call the aws signer because we aren't interacting with aws
    expect(signerSpy).not.toHaveBeenCalled();

    // Creates a connection with the correct parameters
    expect(knex.default).toHaveBeenCalledWith({
      client: 'pg',
      connection: localhostParams,
    });
  });

  it('Establishes a connection in staging environment', async () => {
    config.clusterEnv = 'staging';
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints.mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [{ Endpoint: 'endpointName' }] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    await createSQLClient();

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(AWS.RDS.Signer).toHaveBeenCalledWith({
      hostname: 'endpointName',
      region: 'eu-west-1',
      port: 5432,
      username: 'api_role',
    });

    expect(mockGetAuthTokenSpy).toHaveBeenCalled();

    expect(knex.default).toHaveBeenCalledWith({
      client: 'pg',
      connection: rdsParams,
    });
  });

  it('Fails if there is no writer endpoint available', async () => {
    config.clusterEnv = 'staging';
    config.awsRegion = 'eu-west-1';

    mockDescribeDBClusterEndpoints
      .mockReturnValueOnce({ promise: () => Promise.resolve({ DBClusterEndpoints: [] }) });

    mockGetAuthTokenSpy.mockReturnValueOnce('passwordToken');

    await expect(createSQLClient()).rejects.toThrow();

    expect(mockDescribeDBClusterEndpoints.mock.calls[0]).toMatchSnapshot();

    expect(mockGetAuthTokenSpy).not.toHaveBeenCalled();
    expect(knex.default).not.toHaveBeenCalled();
  });
});
