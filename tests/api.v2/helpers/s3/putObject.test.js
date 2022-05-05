// @ts-nocheck
const putObject = require('../../../../src/api.v2/helpers/s3/putObject');
const getS3Client = require('../../../../src/api.v2/helpers/s3/getS3Client');

const NotFoundError = require('../../../../src/utils/responses/NotFoundError');

jest.mock('../../../../src/api.v2/helpers/s3/S3Client', () => jest.fn(() => ({
  putObject: jest.fn(() => (
    {
      promise: () => Promise.resolve({}),
    }
  )),
})));

class MockS3Error extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const mockBucketName = 'mock-bucket';
const mockKeyName = 'mock-key';
const mockBody = 'mock-body';

const mockParam = {
  Bucket: mockBucketName,
  Key: mockKeyName,
  Body: mockBody,
};

describe('putObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Throws an error if param is in complete', async () => {
    await expect(putObject()).rejects.toThrow();

    const noBucketParam = { ...mockParam };
    delete noBucketParam.Bucket;

    await expect(putObject(noBucketParam)).rejects.toThrow();

    const noKeyParam = { ...mockParam };
    delete noKeyParam.Bucket;

    await expect(putObject(noKeyParam)).rejects.toThrow();

    const noBodyParam = { ...mockParam };
    delete noBodyParam.Bucket;

    await expect(putObject(noKeyParam)).rejects.toThrow();
  });

  it('Does not return anything on success', async () => {
    await expect(putObject(mockParam)).resolves.toBeUndefined();
  });

  it('Throws NotFoundError if bucket is not found', async () => {
    getS3Client.mockImplementation(() => ({
      putObject: jest.fn(() => { throw new MockS3Error('no bucket', 'NoSuchBucket'); }),
    }));

    const errorText = `Couldn't find bucket with key: ${mockBucketName}`;
    await expect(putObject(mockParam)).rejects.toThrow(new NotFoundError(errorText));
  });

  it('Throws a general error if the error is not handled manually', async () => {
    const errMsg = 'key too long';

    getS3Client.mockImplementation(() => ({
      putObject: jest.fn(() => { throw new MockS3Error(errMsg, 'KeyTooLongError'); }),
    }));

    await expect(putObject(mockParam)).rejects.toThrow(errMsg);
  });
});
