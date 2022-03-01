// const Redis = require('ioredis-mock');
const _ = require('lodash');
const CacheSingleton = require('../../src/cache');
const { BASE_CONFIG } = require('../../src/cache/generateConfig');
const { cacheGetRequest, cacheSetResponse } = require('../../src/utils/cacheRequest');

jest.mock('ioredis', () => {
  // eslint-disable-next-line global-require
  const Redis = require('ioredis-mock');

  if (typeof Redis === 'object') {
    // the first mock is an ioredis shim because ioredis-mock depends on it
    // https://github.com/stipsan/ioredis-mock/blob/master/src/index.js#L101-L111
    return {
      Command: { _transformer: { argument: {}, reply: {} } },
    };
  }

  // second mock is the actual constructor. note that this must be
  // a `function` and NOT an anonymous function, as the latter is not a valid
  // ES constructor

  // eslint-disable-next-line func-names
  return function (args) {
    const object = new Redis({ ...args, lazyConnect: false });
    object.status = 'ready';

    return object;
  };
});

describe('disabled caching works', () => {
  const mockResponse = {
    request: {},
    result: ['some result'],
  };

  it('creates a new instance with caching disabled', () => {
    // Minimum latency is set to 0 to get consistent effects. This will ensure
    // we always get a high enough latency to use the L1 cache.
    CacheSingleton.get({
      ...BASE_CONFIG,
      l1CacheSettings: {
        ...BASE_CONFIG.l1CacheSettings,
        minLatencyToStore: 0,
      },
      enabled: false,
    });
  });

  it('creates a reader and a primary endpoint', () => {
    const cache = CacheSingleton.get();

    const primary = cache.getClientAndStatus('primary');
    const reader = cache.getClientAndStatus('reader');

    expect(primary.ready).toEqual(true);
    expect(reader.ready).toEqual(true);

    expect(reader).not.toEqual(primary);
  });

  it('can set data', async () => {
    const cache = CacheSingleton.get();
    await cache.set('keya', mockResponse);
  });

  it('set data is discarded', async () => {
    const cache = CacheSingleton.get();
    await expect(cache.get('keya')).rejects.toThrow();
  });
});
