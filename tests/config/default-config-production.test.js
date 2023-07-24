// @ts-nocheck
const _ = require('lodash');

const AWS = require('aws-sdk');
const isPromise = require('../../src/utils/isPromise');
const { ACCOUNT_ID } = require('../../src/api.v2/constants');

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

  it('Returns correct values for BIOMAGE production', () => {
    const prodEnvironment = 'production';
    process.env.NODE_ENV = prodEnvironment;
    process.env.K8S_ENV = prodEnvironment;
    process.env.CLUSTER_ENV = prodEnvironment;
    process.env.AWS_DEFAULT_REGION = 'eu-west-1';
    process.env.AWS_ACCOUNT_ID = ACCOUNT_ID.BIOMAGE;

    const userPoolId = 'mockUserPoolId';
    const accountId = 'mockAccountId';

    AWS.CognitoIdentityServiceProvider = jest.fn(() => ({
      listUserPools: {
        promise: jest.fn(() => Promise.resolve(
          { UserPools: [{ id: userPoolId, Name: `biomage-user-pool-case-insensitive-${prodEnvironment}` }] },
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

  it('Returns correct values for HMS production', () => {
    jest.unmock('../../src/config/default-config');
    jest.resetModules();

    const prodEnvironment = 'production';
    process.env.NODE_ENV = prodEnvironment;
    process.env.K8S_ENV = prodEnvironment;
    process.env.CLUSTER_ENV = prodEnvironment;
    process.env.AWS_DEFAULT_REGION = 'eu-west-1';
    process.env.AWS_ACCOUNT_ID = ACCOUNT_ID.HMS;

    const userPoolId = 'mockUserPoolId';
    const accountId = 'mockAccountId';

    AWS.CognitoIdentityServiceProvider = jest.fn(() => ({
      listUserPools: {
        promise: jest.fn(() => Promise.resolve(
          { UserPools: [{ id: userPoolId, Name: `biomage-user-pool-case-insensitive-${prodEnvironment}` }] },
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
