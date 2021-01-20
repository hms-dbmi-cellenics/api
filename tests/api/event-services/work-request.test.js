const MockSocket = require('socket.io-mock');
const handleWorkRequest = require('../../../src/api/event-services/work-request');
const handlePagination = require('../../../src/utils/handlePagination');
const CacheSingleton = require('../../../src/cache');

jest.mock('../../../src/utils/handlePagination');
jest.mock('../../../src/cache');

describe('handleWorkRequest', () => {
  let socket;

  beforeEach(() => {
    socket = new MockSocket();
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('Throws when an old timeout is encountered.', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2001-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', config: {} },
    };

    try {
      await handleWorkRequest(workRequest, socket);
    } catch (e) {
      expect(e.message).toMatch(
        /^Work request will not be handled as timeout/,
      );
    }
  });

  it('Triggers pagination when pagination is specified and result is cached already.', async () => {
    CacheSingleton.createMock({
      '71d05443e350f1a9633f8c1cc5282b56': { // pragma: allowlist secret
        results: [
          {
            body: JSON.stringify({
              rows:
                [
                  {
                    name: 'z',
                  },
                  {
                    name: 'c',
                  },
                  {
                    name: 'a',
                  },
                ],
            }),
          },
        ],
      },
    });

    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: {
        name: 'DifferentialExpression', cellSet: 'louvain-0', compareWith: 'rest', maxNum: 500,
      },
      pagination: {
        orderBy: 'name',
        orderDirection: 'ASC',
        offset: 0,
        limit: 5,
        responseKey: 0,
      },
    };

    await handleWorkRequest(workRequest, socket);
    expect(CacheSingleton.get().get).toHaveBeenCalledTimes(1);
    expect(handlePagination.handlePagination).toHaveBeenCalledTimes(1);
  });
});
