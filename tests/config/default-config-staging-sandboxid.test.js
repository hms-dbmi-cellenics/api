// @ts-nocheck
const _ = require('lodash');

const AWS = require('aws-sdk');
const isPromise = require('../../src/utils/isPromise');

jest.mock('aws-sdk');
jest.mock('../../src/utils/getLogger');

describe('default-config', () => {
  const OLD_ENV = _.cloneDeep(process.env);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = OLD_ENV;
  });

  afterAll(() => {
    jest.clearAllMocks();
    process.env = OLD_ENV;
  });

  it('Returns correct values for staging sandboxid', () => {
    const stagingEnvironment = 'staging';
    process.env.K8S_ENV = stagingEnvironment;
    process.env.CLUSTER_ENV = stagingEnvironment;
    process.env.SANDBOX_ID = 'mockedSandboxId';
    process.env.AWS_DEFAULT_REGION = 'eu-west-1';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.RDS_SANDBOX_ID = 'default';
    process.env.AWS_ROLE_ARN = 'arn:aws:iam::242905224710:role/api-role-production';
    process.env.AWS_STS_REGIONAL_ENDPOINTS = 'regional';
    process.env.AWS_WEB_IDENTITY_TOKEN_FILE = 'AWS_WEB_IDENTITY_TOKEN_FILEMocked';
    process.env.AWS_XRAY_DAEMON_ADDRESS = 'AWS_XRAY_DAEMON_ADDRESSMocked';
    process.env.DOMAIN_NAME = 'scp-staging.biomage.net';

    const userPoolId = 'mockUserPoolId';
    const accountId = 'mockAccountId';

    AWS.CognitoIdentityServiceProvider = jest.fn(() => ({
      listUserPools: {
        promise: jest.fn(() => Promise.resolve(
          { UserPools: [{ id: userPoolId, Name: `biomage-user-pool-case-insensitive-${stagingEnvironment}` }] },
        )),
      },
    }));

    AWS.STS = jest.fn(() => ({
      getCallerIdentity: {
        promise: jest.fn(() => Promise.resolve({ Account: accountId })),
      },
    }));

    const defaultConfig = jest.requireActual('../../src/config/default-config');

    const defaultConfigEntries = Object.entries(defaultConfig);
    const filteredEntries = defaultConfigEntries.filter(([, value]) => !isPromise(value));
    const defaultConfigFiltered = Object.fromEntries(filteredEntries);

    expect(defaultConfigFiltered).toMatchSnapshot();
  });
});
