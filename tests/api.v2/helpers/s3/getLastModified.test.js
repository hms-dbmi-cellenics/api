const getLastModified = require('../../../../src/api.v2/helpers/s3/getLastModified');
const getS3Client = require('../../../../src/api.v2/helpers/s3/getS3Client');
const NotFoundError = require('../../../../src/utils/responses/NotFoundError');

jest.mock('../../../../src/api.v2/helpers/s3/getS3Client', () => jest.fn(() => ({
  headObject: jest.fn(() => (
    {
      promise: () => Promise.resolve({
        LastModified: new Date('2021-01-01T00:00:00Z'),
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

describe('getLastModified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Throws an error if param is incomplete', async () => {
    await expect(getLastModified()).rejects.toThrow();

    const noBucketParam = { ...mockParam };
    delete noBucketParam.Bucket;

    await expect(getLastModified(noBucketParam)).rejects.toThrow();

    const noKeyParam = { ...mockParam };
    delete noKeyParam.Key;

    await expect(getLastModified(noKeyParam)).rejects.toThrow();
  });

  it('Returns last modified date from S3', async () => {
    const date = await getLastModified(mockParam);
    expect(date).toEqual(new Date('2021-01-01T00:00:00Z'));
  });

  it('Throws NotFoundError if bucket is not found', async () => {
    getS3Client.mockImplementation(() => ({
      headObject: jest.fn(() => { throw new MockS3Error('no bucket', 'NoSuchBucket'); }),
    }));

    const errorText = `Couldn't find bucket with key: ${mockBucketName}`;
    await expect(getLastModified(mockParam)).rejects.toThrow(new NotFoundError(errorText));
  });

  it('Throws NotFoundError if key is not found', async () => {
    getS3Client.mockImplementation(() => ({
      headObject: jest.fn(() => { throw new MockS3Error('no object with key', 'NoSuchKey'); }),
    }));

    const errorText = `Couldn't find object with key: ${mockKeyName}`;
    await expect(getLastModified(mockParam)).rejects.toThrow(new NotFoundError(errorText));
  });

  it('Throws a general error if the error is not handled manually', async () => {
    const errMsg = 'key too long';

    getS3Client.mockImplementation(() => ({
      headObject: jest.fn(() => { throw new MockS3Error(errMsg, 'KeyTooLongError'); }),
    }));

    await expect(getLastModified(mockParam)).rejects.toThrow(errMsg);
  });
});
