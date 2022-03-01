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

describe('cache, always saves to L1', () => {
  const mockResponse = {
    request: {},
    result: ['some result'],
  };

  it('creates a new instance when the singleton is called first', () => {
    // Minimum latency is set to 0 to get consistent effects. This will ensure
    // we always get a high enough latency to use the L1 cache.
    CacheSingleton.get({
      ...BASE_CONFIG,
      l1CacheSettings: {
        ...BASE_CONFIG.l1CacheSettings,
        minLatencyToStore: 0,
      },
      enabled: true,
    });
  });

  it('throws when we try to reinstantiate cache singleton with different config', () => {
    expect(() => {
      CacheSingleton.get(
        { ...BASE_CONFIG, a: 1 },
      );
    }).toThrow('configuration specified does not match');
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

  it('getting it the first time will be from redis', async () => {
    const cache = CacheSingleton.get();
    const result = await cache.get('keya');

    expect(result).toMatchObject(mockResponse);
    expect(result.responseFrom).toBe('redis');
  });

  it('getting data a second time results in result from l1 cache', async () => {
    const cache = CacheSingleton.get();
    const result = await cache.get('keya');

    expect(result).toMatchObject(mockResponse);
    expect(result.responseFrom).toBe('l1Cache');
  });

  it('will return a copy (clone) of a value stored in l1', async () => {
    const request = {
      uuid: 'requestUuid',
      socketId: 'socketio.id',
      experimentId: 'experimentId',
      timeout: 6000,
      body: {
        name: 'ListGenes',
        selectFields: ['gene_names', 'dispersions'],
        orderBy: 'name',
        orderDirection: 'ASC',
        offset: 10,
        limit: 15,
      },
    };

    const response = {
      request,
      result: ['some result'],
    };

    // Let's put the item into the cache.
    await cacheSetResponse(response);

    // Let's get the item from the cache.
    const firstResult = await cacheGetRequest(request, jest.fn(), jest.fn());
    // First lookup will come from redis.
    expect(firstResult.responseFrom).toEqual('redis');

    // Get the result again.
    const secondResult = await cacheGetRequest(request, jest.fn(), jest.fn());
    // Assert that we got this from the mocked l1Cache.
    expect(secondResult.responseFrom).toEqual('l1Cache');
    // Save a copy of it.
    const resultSnapshot = _.cloneDeep(secondResult);

    // Modify the one returned from `cacheGetRequest`.
    secondResult.result[0] = 'some other string';
    // Get the same thing from the l1 cache again.
    const thirdResult = await cacheGetRequest(request, jest.fn(), jest.fn());
    // Assert that we got this from the mocked l1Cache as well.
    expect(thirdResult.responseFrom).toEqual('l1Cache');
    // The returned value should not have changed.
    expect(thirdResult).toEqual(resultSnapshot);
    expect(thirdResult).not.toEqual(secondResult);
  });
});
