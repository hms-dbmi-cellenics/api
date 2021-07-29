const MockSocket = require('socket.io-mock');
const handleWorkRequest = require('../../../src/api/event-services/work-request');
const handlePagination = require('../../../src/utils/handlePagination');
const CacheSingleton = require('../../../src/cache');
const getPipelineStatus = require('../../../src/api/general-services/pipeline-status');
const pipelineConstants = require('../../../src/api/general-services/pipeline-manage/constants');

jest.mock('../../../src/api/general-services/pipeline-status');
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
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: 0.3, distanceMetric: 'euclidean' } },
    };

    try {
      await handleWorkRequest(workRequest, socket);
    } catch (e) {
      expect(e.message).toMatch(
        /^Work request will not be handled as timeout/,
      );
    }
  });

  it('Throws when type isnt valid.', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'invalidType', config: { minimumDistance: 0.3, distanceMetric: 'invalidMetric' } },
    };

    try {
      await handleWorkRequest(workRequest, socket);
    } catch (e) {
      expect(e.message).toMatch(
        /^Error: type does not match the pattern/,
      );
    }
  });

  it('Throws when an invalid distanceMetric in getEmbedding is encountered.', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: 0.3, distanceMetric: 'invalidMetric' } },
    };

    try {
      await handleWorkRequest(workRequest, socket);
    } catch (e) {
      expect(e.message).toMatch(
        /^Error: distanceMetric is not set to an allowed value/,
      );
    }
  });

  it('Throws when an invalid minimumDistance in getEmbedding is encountered.', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: -1, distanceMetric: 'euclidean' } },
    };

    try {
      await handleWorkRequest(workRequest, socket);
    } catch (e) {
      expect(e.message).toMatch(
        /^Error: minimumDistance must be at least 0/,
      );
    }
  });

  it('Throws when there is a missing config property.', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { distanceMetric: 'euclidean' } },
    };

    try {
      await handleWorkRequest(workRequest, socket);
    } catch (e) {
      expect(e.message).toMatch(
        /^Error: minimumDistance is a required field/,
      );
    }
  });

  it('Throws if pipeline is not yet done or have failed', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      uuid: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { distanceMetric: 'euclidean' } },
    };

    getPipelineStatus.mockImplementationOnce(() => ({
      qc: {
        ...getPipelineStatus.responseTemplates.qc,
        status: pipelineConstants.RUNNING,
      },
    }));

    try {
      await handleWorkRequest(workRequest, socket);
    } catch (e) {
      expect(e.message).toMatch(
        'Work request can not be handled because pipeline is RUNNING',
      );
    }
  });

  it('Triggers pagination when pagination is specified and result is cached already.', async () => {
    CacheSingleton.createMock({
      '1030360683237eb6175194541f83d6f5': { // pragma: allowlist secret
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
