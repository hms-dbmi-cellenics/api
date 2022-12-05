const validateAndSubmitWork = require('../../../src/api.v2/events/validateAndSubmitWork');
const CacheSingleton = require('../../../src/cache');
const getPipelineStatus = require('../../../src/api.v2/helpers/pipeline/getPipelineStatus');
const pipelineConstants = require('../../../src/api.v2/constants');
const WorkSubmitService = require('../../../src/api.v2/helpers/worker/workSubmit')();

jest.mock('../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../src/cache');
jest.mock('../../../src/api.v2/helpers/worker/workSubmit');

describe('handleWorkRequest', () => {
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
      ETag: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2001-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: 0.3, distanceMetric: 'euclidean' } },
    };

    try {
      await validateAndSubmitWork(workRequest);
    } catch (e) {
      expect(e.message).toMatch(
        /^Request timed out at/,
      );
    }
  });

  it('Throws when type isnt valid.', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      ETag: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'invalidType', config: { minimumDistance: 0.3, distanceMetric: 'invalidMetric' } },
    };

    try {
      await validateAndSubmitWork(workRequest);
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
      ETag: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: 0.3, distanceMetric: 'invalidMetric' } },
    };

    try {
      await validateAndSubmitWork(workRequest);
    } catch (e) {
      expect(e.message).toMatch(
        /^Error: distanceMetric must be one of the following:/,
      );
    }
  });

  it('Throws when an invalid minimumDistance in getEmbedding is encountered.', async () => {
    // Initialize with an empty cache so a worker hit will be encountered.
    CacheSingleton.createMock({});
    expect.assertions(1);

    const workRequest = {
      ETag: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: -1, distanceMetric: 'euclidean' } },
    };

    try {
      await validateAndSubmitWork(workRequest);
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
      ETag: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { distanceMetric: 'euclidean' } },
    };

    try {
      await validateAndSubmitWork(workRequest);
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
      ETag: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: 0, distanceMetric: 'euclidean' } },
    };

    getPipelineStatus.mockImplementationOnce(() => ({
      qc: {
        ...getPipelineStatus.responseTemplates.qc,
        status: pipelineConstants.RUNNING,
      },
    }));

    try {
      await validateAndSubmitWork(workRequest);
    } catch (e) {
      expect(e.message).toMatch(
        'Work request can not be handled because pipeline is RUNNING',
      );
    }
  });

  it('Submits work request when correct request and and pipeline status are present', async () => {
    const workRequest = {
      ETag: '12345',
      socketId: '6789',
      experimentId: 'my-experiment',
      timeout: '2099-01-01T00:00:00Z',
      body: { name: 'GetEmbedding', type: 'umap', config: { minimumDistance: 0, distanceMetric: 'euclidean' } },
    };
    await validateAndSubmitWork(workRequest);
    expect(WorkSubmitService.submitWork).toHaveBeenCalled();
  });
});
