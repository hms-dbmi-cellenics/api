const _ = require('lodash');

const handleWorkRequest = require('../../../src/api.v2/events/handleWorkRequest');
const generateETag = require('../../../src/api.v2/helpers/worker/generateEtag');
const getWorkResults = require('../../../src/api.v2/helpers/worker/getWorkResults');
const validateAndSubmitWork = require('../../../src/api.v2/events/validateAndSubmitWork');
const fake = require('../../test-utils/constants');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('../../../src/api.v2/helpers/worker/generateEtag');
jest.mock('../../../src/api.v2/helpers/worker/getWorkResults');
jest.mock('../../../src/api.v2/events/validateAndSubmitWork');

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
  });

  it('generates ETag successfully', async () => {
    generateETag.mockResolvedValue('new-etag');
    await handleWorkRequest(authJWT, data);
    expect(generateETag).toHaveBeenCalledWith(_.pick(data, ['experimentId', 'body', 'requestProps']));
  });

  it('handles existing work results', async () => {
    getWorkResults.mockResolvedValue({ signedUrl: 'some-signed-url' });
    const result = await handleWorkRequest(authJWT, data);
    expect(result).toEqual({ ETag: 'new-etag', signedUrl: 'some-signed-url' });
  });

  it('handles non-existing work results and submits new work', async () => {
    getWorkResults.mockRejectedValue({ status: 404 });
    const result = await handleWorkRequest(authJWT, data);
    expect(validateAndSubmitWork).toHaveBeenCalledWith({ ETag: 'new-etag', Authorization: authJWT, ...data });
    expect(result).toEqual({ ETag: 'new-etag', signedUrl: null });
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
