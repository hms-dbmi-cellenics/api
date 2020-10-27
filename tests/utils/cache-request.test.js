const MockSocket = require('socket.io-mock');
const { cacheSetResponse, cacheGetRequest } = require('../../src/utils/cache-request');
const { CacheMissError } = require('../../src/cache/cache-utils');

const CacheSingleton = require('../../src/cache');

jest.mock('../../src/cache');

describe('cache(Get/Set)Request', () => {
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

  let cache;
  let socket;

  beforeAll(() => {
    CacheSingleton.createMock({
      '7b18513d240c9ad9dfd003a39a6be9fb': { result: 'valueInL1' }, // pragma: allowlist secret
    });

    cache = CacheSingleton.get();
  });

  beforeEach(() => {
    socket = new MockSocket();
  });

  it('cacheGetRequest, cache miss', async () => {
    expect.assertions(3);

    let result;

    try {
      result = await cacheGetRequest(request, () => null, socket);
    } catch (e) {
      expect(e).toBeInstanceOf(CacheMissError);
    }

    expect(cache.get).toHaveBeenCalledWith('6ae8b54798a716938d34ebea01d40307'); // pragma: allowlist secret
    expect(result).toBe(undefined);
  });

  it('cacheGetRequest, cache hit', async () => {
    const newRequest = { ...request, experimentId: 'newExperimentId' };
    const result = await cacheGetRequest(newRequest, () => null, socket);

    expect(result).toEqual({ result: 'valueInL1' });
    expect(cache.get).toHaveBeenCalledWith('7b18513d240c9ad9dfd003a39a6be9fb'); // pragma: allowlist secret
  });

  it('cacheSetResponse', async () => {
    await cacheSetResponse(response);

    expect(cache.set).toHaveBeenCalledWith('6ae8b54798a716938d34ebea01d40307', { // pragma: allowlist secret
      request,
      result: response.result,
    }, 900);
  });
});
