const _ = require('lodash');

const handleWorkRequest = require('../../../src/api.v2/events/handleWorkRequest');
const generateETag = require('../../../src/api.v2/helpers/worker/generateEtag');
const getWorkResults = require('../../../src/api.v2/helpers/worker/getWorkResults');
const validateAndSubmitWork = require('../../../src/api.v2/events/validateAndSubmitWork');
const waitForWorkerReady = require('../../../src/api.v2/helpers/worker/waitForWorkerReady');
const fake = require('../../test-utils/constants');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('../../../src/api.v2/helpers/worker/generateEtag');
jest.mock('../../../src/api.v2/helpers/worker/getWorkResults');
jest.mock('../../../src/api.v2/events/validateAndSubmitWork');
jest.mock('../../../src/api.v2/helpers/worker/waitForWorkerReady');

const data = {
  uuid: 'someuuid-asd-asd-asdddasa',
  ETag: 'etag-of-the-work-request',
  experimentId: fake.EXPERIMENT_ID,
  body: { someParam: true },
  requestProps: { broadcast: false, cacheUniquenessKey: null },
};
const authJWT = 'Bearer someLongAndConfusingString';

describe('Handle work', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateETag.mockResolvedValue('new-etag');
  });

  it('generates ETag successfully', async () => {
    getWorkResults.mockResolvedValue({ signedUrl: 'some-signed-url' });
    await handleWorkRequest(authJWT, data);
    expect(generateETag).toHaveBeenCalledWith(_.pick(data, ['experimentId', 'body', 'requestProps']));
  });

  it('handles existing work results', async () => {
    getWorkResults.mockResolvedValue({ signedUrl: 'some-signed-url' });
    const result = await handleWorkRequest(authJWT, data);
    expect(result).toEqual({ ETag: 'new-etag', signedUrl: 'some-signed-url' });
    expect(waitForWorkerReady).not.toHaveBeenCalled();
  });

  it('submits work when worker becomes ready within timeout', async () => {
    getWorkResults.mockRejectedValue({ status: 404 });
    waitForWorkerReady.mockResolvedValue('ready');
    const result = await handleWorkRequest(authJWT, data);
    expect(waitForWorkerReady).toHaveBeenCalledWith(data.experimentId, 120000, 5000);
    expect(validateAndSubmitWork).toHaveBeenCalledWith({ ETag: 'new-etag', Authorization: authJWT, ...data });
    expect(waitForWorkerReady).toHaveBeenCalledWith(fake.EXPERIMENT_ID, 120000, 5000);
    expect(result).toEqual({ ETag: 'new-etag', signedUrl: null });
  });

  it('returns timeout error when worker is not ready in time', async () => {
    getWorkResults.mockRejectedValue({ status: 404 });
    validateAndSubmitWork.mockResolvedValue({ name: 'worker-pod', phase: 'Running' });
    waitForWorkerReady.mockResolvedValue('timeout');
    const result = await handleWorkRequest(authJWT, data);
    expect(result).toEqual({ ETag: 'new-etag', signedUrl: null, errorCode: 'WORKER_STARTUP_TIMEOUT' });
  });

  it('does not wait if podInfo is empty (development mode)', async () => {
    getWorkResults.mockRejectedValue({ status: 404 });
    validateAndSubmitWork.mockResolvedValue({});
    const result = await handleWorkRequest(authJWT, data);
    expect(waitForWorkerReady).not.toHaveBeenCalled();
    expect(result).toEqual({ ETag: 'new-etag', signedUrl: null });
  });

  it('returns error code when worker startup times out', async () => {
    getWorkResults.mockRejectedValue({ status: 404 });
    waitForWorkerReady.mockResolvedValue('timeout');
    const result = await handleWorkRequest(authJWT, data);
    expect(waitForWorkerReady).toHaveBeenCalledWith(data.experimentId, 120000, 5000);
    expect(validateAndSubmitWork).not.toHaveBeenCalled();
    expect(result).toEqual({ ETag: 'new-etag', signedUrl: null, errorCode: 'WORKER_STARTUP_TIMEOUT' });
  });

  it('throws error for non-404 status from getWorkResults', async () => {
    getWorkResults.mockRejectedValue({ status: 400 });
    let error;
    try {
      await handleWorkRequest(authJWT, data);
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.status).toBe(400);
  });
});
