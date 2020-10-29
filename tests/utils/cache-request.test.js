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
      '342929f67be6fa03d7881518c4adcbc8': { result: 'valueInL1' }, // pragma: allowlist secret
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

    expect(cache.get).toHaveBeenCalledWith('4b6ecb0d54a075f941edfb40bd7426f7'); // pragma: allowlist secret
    expect(result).toBe(undefined);
  });

  it('cacheGetRequest, cache hit', async () => {
    const newRequest = { ...request, experimentId: 'newExperimentId' };
    const result = await cacheGetRequest(newRequest, () => null, socket);

    expect(result).toEqual({ result: 'valueInL1' });
    expect(cache.get).toHaveBeenCalledWith('342929f67be6fa03d7881518c4adcbc8'); // pragma: allowlist secret
  });

  it('cacheSetResponse', async () => {
    await cacheSetResponse(response);

    expect(cache.set).toHaveBeenCalledWith('4b6ecb0d54a075f941edfb40bd7426f7', { // pragma: allowlist secret
      request,
      result: response.result,
    }, 900);
  });
});
