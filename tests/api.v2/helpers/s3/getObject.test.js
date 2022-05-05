// @ts-nocheck
const getObject = require('../../../../src/api.v2/helpers/s3/getObject');
const getS3Client = require('../../../../src/api.v2/helpers/s3/getS3Client');

const NotFoundError = require('../../../../src/utils/responses/NotFoundError');

jest.mock('../../../../src/api.v2/helpers/s3/S3Client', () => jest.fn(() => ({
  getObject: jest.fn(() => (
    {
      promise: () => Promise.resolve({
        Body: {
          toString: () => 'some data',
        },
      }),
    }
  )),
})));

const mockBucketName = 'mock-bucket';
const mockKeyName = 'mock-key';

class MockS3Error extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const mockParam = {
  Bucket: mockBucketName,
  Key: mockKeyName,
};

describe('getObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Throws an error if param is in complete', async () => {
    await expect(getObject()).rejects.toThrow();

    const noBucketParam = { ...mockParam };
    delete noBucketParam.Bucket;

    await expect(getObject(noBucketParam)).rejects.toThrow();

    const noKeyParam = { ...mockParam };
    delete noKeyParam.Key;

    await expect(getObject(noKeyParam)).rejects.toThrow();
  });

  it('Returns data from S3', async () => {
    const data = await getObject(mockParam);
    expect(data).toEqual('some data');
  });

  it('Throws NotFoundError if bucket is not found', async () => {
    getS3Client.mockImplementation(() => ({
      getObject: jest.fn(() => { throw new MockS3Error('no bucket', 'NoSuchBucket'); }),
    }));

    const errorText = `Couldn't find bucket with key: ${mockBucketName}`;
    await expect(getObject(mockParam)).rejects.toThrow(new NotFoundError(errorText));
  });

  it('Throws NotFoundError if key is not found', async () => {
    getS3Client.mockImplementation(() => ({
      getObject: jest.fn(() => { throw new MockS3Error('no object with key', 'NoSuchKey'); }),
    }));

    const errorText = `Couldn't find object with key: ${mockKeyName}`;
    await expect(getObject(mockParam)).rejects.toThrow(new NotFoundError(errorText));
  });

  it('Throws a general error if the error is not handled manually', async () => {
    const errMsg = 'key too long';

    getS3Client.mockImplementation(() => ({
      getObject: jest.fn(() => { throw new MockS3Error(errMsg, 'KeyTooLongError'); }),
    }));

    await expect(getObject(mockParam)).rejects.toThrow(errMsg);
  });
});
