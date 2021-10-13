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

  beforeAll(() => {
    CacheSingleton.createMock({
      d7c612d3d09f3977130241c744b5baba: { result: 'valueInL1' }, // pragma: allowlist secret
    });

    cache = CacheSingleton.get();
  });

  it('cacheGetRequest, cache miss', async () => {
    expect.assertions(3);

    let result;

    try {
      result = await cacheGetRequest(request);
    } catch (e) {
      expect(e).toBeInstanceOf(CacheMissError);
    }

    expect(cache.get).toHaveBeenCalledWith('c5b7ac78783be95c0f4152b5de225e96'); // pragma: allowlist secret
    expect(result).toBe(undefined);
  });

  it('cacheGetRequest, cache hit', async () => {
    const newRequest = { ...request, experimentId: 'newExperimentId' };
    const result = await cacheGetRequest(newRequest);

    expect(result).toEqual({ result: 'valueInL1' });
    expect(cache.get).toHaveBeenCalledWith('d7c612d3d09f3977130241c744b5baba'); // pragma: allowlist secret
  });

  it('cacheSetResponse', async () => {
    await cacheSetResponse(response);

    expect(cache.set).toHaveBeenCalledWith('c5b7ac78783be95c0f4152b5de225e96', { // pragma: allowlist secret
      request,
      result: response.result,
    }, 129600);
  });
});
