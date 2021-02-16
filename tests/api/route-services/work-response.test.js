/* eslint-disable consistent-return */
const AWSMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');
const ioClient = require('socket.io-client');
const ioServer = require('socket.io');
const WorkResponseService = require('../../../src/api/route-services/work-response');
const CacheSingleton = require('../../../src/cache');

jest.mock('../../../src/cache');

describe('tests for the work-response service', () => {
  let io;
  let client;

  const S3_RESULT_ID = '509520fe-d329-437d-8752-b5868ad59425/48637d30-a88d-481e-b8cc-5eedd7e3af1c';
  const S3_BUCKET_NAME = 'worker-results-staging';
  const OBJECT_CONTENT = 'my amazing body';

  const responseFormat = {
    request: {
      uuid: '55',
      socketId: null,
      experimentId: '5e959f9c9f4b120771249001',
      timeout: '2099-01-01T00:00:00Z',
      body: {
        name: 'GetEmbedding',
        config: {
          minimumDistance: 0.3,
          distanceMetric: 'euclidean',
        },
        type: 'pca',
      },
    },
    response: {
      error: false,
      cacheable: true,
    },
  };

  beforeAll(() => {
    CacheSingleton.createMock({});
    io = ioServer.listen(3001);
  });

  beforeEach((done) => {
    AWSMock.setSDKInstance(AWS);
    client = ioClient.connect('http://localhost:3001', {
      'reconnection delay': 0,
      'reopen delay': 0,
      'force new connection': true,
      transports: ['websocket'],
    });

    client.on('connect', () => {
      responseFormat.request.socketId = client.id;
      done();
    });
  });

  afterEach(() => {
    AWSMock.restore();

    if (client.connected) {
      client.disconnect();
    }
  });

  afterAll(() => {
    io.close();
  });

  it('Throws during validation if invalid data is supplied', async (done) => {
    try {
      // eslint-disable-next-line no-new
      await new WorkResponseService(io, {});
    } catch (e) {
      expect(e.message).toEqual('Error: Unable to validate an empty value for property: rootModel');
      return done();
    }
  });

  it('Does not send back timed-out items', async () => {
    const workResponse = {
      ...responseFormat,
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-17.86727523803711, 4.7951226234436035], [2.4647858142852783, -4.940079689025879]]',
          type: 'inline',
        },
      ],
    };

    client.on('message', () => {
      throw new Error('Timeout expired, socket should not have had message sent to it.');
    });

    const wr = await new WorkResponseService(io, workResponse);
    await wr.handleResponse();
  });

  it('Can consume work response with a single inline item', async (done) => {
    const workResponse = {
      ...responseFormat,
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-17.86727523803711, 4.7951226234436035], [2.4647858142852783, -4.940079689025879]]',
          type: 'inline',
        },
      ],
    };

    const w = await new WorkResponseService(io, workResponse);
    const expectedResponse = JSON.parse(JSON.stringify(workResponse));
    delete expectedResponse.results[0].type;

    client.on(`WorkResponse-${workResponse.request.uuid}`, (res) => {
      expect(res).toEqual(expectedResponse);
      done();
    });

    await w.handleResponse();
  });

  it('Can consume work response with multiple inline items', async (done) => {
    const workResponse = {
      ...responseFormat,
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-17.86727523803711, 4.7951226234436035], [2.4647858142852783, -4.940079689025879]]',
          type: 'inline',
        },
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-17, 5], [45, -8]]',
          type: 'inline',
        },
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-1, 4], [2, -4], [3, 4]]',
          type: 'inline',
        }],
    };

    const w = await new WorkResponseService(io, workResponse);
    const expectedResponse = JSON.parse(JSON.stringify(workResponse));
    expectedResponse.results
      .forEach((res) => delete res.type);

    client.on(`WorkResponse-${workResponse.request.uuid}`, (res) => {
      expect(res).toEqual(expectedResponse);
      done();
    });

    await w.handleResponse();
  });

  it('Can consume work response with a single processS3PathType item', async (done) => {
    expect.assertions(3);

    const workResponse = {
      ...responseFormat,
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: `${S3_BUCKET_NAME}/${S3_RESULT_ID}`,
          type: 's3-path',
        },
      ],
    };

    AWSMock.mock('S3', 'getObject', (params, callback) => {
      const { Bucket, Key } = params;

      expect(Bucket).toEqual(S3_BUCKET_NAME);
      expect(Key).toEqual(S3_RESULT_ID);

      callback(null, {
        ContentEncoding: 'utf-8',
        ContentType: 'application/json',
        Body: OBJECT_CONTENT,
      });
    });

    client.on(`WorkResponse-${workResponse.request.uuid}`, (res) => {
      const expectedResponse = JSON.parse(JSON.stringify(workResponse));
      delete expectedResponse.results[0].type;
      expectedResponse.results[0].body = 'my amazing body';

      expect(res).toEqual(expectedResponse);
      done();
    });

    const w = await new WorkResponseService(io, workResponse);
    await w.handleResponse();
  });

  it('Can consume work response with different types of items', async (done) => {
    expect.assertions(3);

    const workResponse = {
      ...responseFormat,
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: `${S3_BUCKET_NAME}/${S3_RESULT_ID}`,
          type: 's3-path',
        },
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-17.86727523803711, 4.7951226234436035], [2.4647858142852783, -4.940079689025879]]',
          type: 'inline',
        },
      ],
    };

    AWSMock.mock('S3', 'getObject', (params, callback) => {
      const { Bucket, Key } = params;

      expect(Bucket).toEqual(S3_BUCKET_NAME);
      expect(Key).toEqual(S3_RESULT_ID);

      callback(null, {
        ContentEncoding: 'utf-8',
        ContentType: 'application/json',
        Body: OBJECT_CONTENT,
      });
    });

    client.on(`WorkResponse-${workResponse.request.uuid}`, (res) => {
      const expectedResponse = JSON.parse(JSON.stringify(workResponse));
      delete expectedResponse.results[0].type;
      expectedResponse.results[0].body = 'my amazing body';

      expect(res).toEqual(expectedResponse);
      done();
    });

    const w = await new WorkResponseService(io, workResponse);
    await w.handleResponse();
  });

  it('Can produce paginated work response', async (done) => {
    const pagination = {
      orderBy: 'qval',
      orderDirection: 'ASC',
      offset: 0,
      limit: 2,
      responseKey: 0,
    };

    const RESPONSE_BODY = '{"rows": [{"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "A"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "B"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "C"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "D"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "E"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "F"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "G"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "H"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "I"}, {"pval": 0.2, "qval": 0.3, "log2fc": 2.4, "gene_names": "J"}]}';

    const workResponse = {
      ...responseFormat,
      request: {
        ...responseFormat.request,
        pagination,
      },
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: RESPONSE_BODY,
          type: 'inline',
        },
      ],
    };

    client.on(`WorkResponse-${workResponse.request.uuid}`, (res) => {
      const expectedResponse = JSON.parse(JSON.stringify(workResponse));
      // eslint-disable-next-line no-param-reassign
      expectedResponse.results.forEach((result) => delete result.type);

      const expectedBody = JSON.parse(RESPONSE_BODY);
      expectedBody.total = expectedBody.rows.length;
      expectedBody.rows = expectedBody.rows.slice(0, pagination.limit);
      expectedResponse.results[0].body = JSON.stringify(expectedBody);

      expect(res).toEqual(expectedResponse);
      done();
    });

    const w = await new WorkResponseService(io, workResponse);
    await w.handleResponse();
  });

  it('Does not cache response when `cacheable` is set to false', async () => {
    CacheSingleton.createMock({});

    const workResponse = {
      ...responseFormat,
      response: {
        ...responseFormat.response,
        cacheable: false,
      },
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-17.86727523803711, 4.7951226234436035], [2.4647858142852783, -4.940079689025879]]',
          type: 'inline',
        },
      ],
    };

    const w = await new WorkResponseService(io, workResponse);
    await w.handleResponse();

    const cache = CacheSingleton.get();
    expect(cache.mockGetItems()).toEqual({});
  });

  it('Caches response when `cacheable` is set to true', async () => {
    CacheSingleton.createMock({});

    const workResponse = {
      ...responseFormat,
      results: [
        {
          'content-type': 'application/json',
          'content-encoding': 'utf-8',
          body: '[[-17.86727523803711, 4.7951226234436035], [2.4647858142852783, -4.940079689025879]]',
          type: 'inline',
        },
      ],
    };

    const w = await new WorkResponseService(io, workResponse);
    await w.handleResponse();

    const cache = CacheSingleton.get();
    expect(Object.values(cache.mockGetItems())).toEqual([workResponse]);
  });
});
