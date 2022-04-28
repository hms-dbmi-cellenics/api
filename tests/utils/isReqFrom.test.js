

jest.mock('dns', () => ({
  promises: {
    reverse: jest.fn((ip) => {
      if (ip === '127.0.0.1') return [];
      return ['ip-192-168-905-123.region.compute.internal'];
    }),
  },
}));

const {
  isReqFromCluster,
  isReqFromLocalhost,
} = require('../../src/utils/isReqFrom');
const fake = require('../test-utils/constants');

describe('Tests for isRequestFromCluster and isRequestFromLocalhost', () => {
  it('isReqFromLocalhost returns true for localhost', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.USER,
      url: `/v1/experiments/${fake.EXPERIMENT_ID}/cellSets`,
      method: 'PATCH',
      connection: {
        address: '::ffff:127.0.0.1',
      },
      get: () => 'localhost',
    };

    expect(await isReqFromLocalhost(req)).toEqual(true);
  });

  it('isRequestFromLocalhost throws with cluster addr', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.USER,
      url: `/v1/experiments/${fake.EXPERIMENT_ID}/cellSets`,
      method: 'PATCH',
      ip: '::ffff:192.0.0.1',
      connection: {
        address: '::ffff:192.0.0.1',
      },
      get: () => 'whatever.internal.compute',
    };

    await expect(isReqFromLocalhost(req))
      .rejects
      .toThrow();
  });

  it('isReqFromCluster returns true for cluster addr', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.USER,
      url: `/v1/experiments/${fake.EXPERIMENT_ID}/cellSets`,
      method: 'PATCH',
      ip: '::ffff:192.0.0.1',
    };

    expect(await isReqFromCluster(req)).toEqual(true);
  });

  it('isRequestFromCluster throws with localhost', async () => {
    const req = {
      params: { experimentId: fake.EXPERIMENT_ID },
      user: fake.USER,
      url: `/v1/experiments/${fake.EXPERIMENT_ID}/cellSets`,
      method: 'PATCH',
      ip: '::ffff:127.0.0.1',
    };

    await expect(isReqFromCluster(req))
      .rejects
      .toThrow();
  });
});
