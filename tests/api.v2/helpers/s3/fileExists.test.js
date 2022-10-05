const { fileExists } = require('../../../../src/api.v2/helpers/s3/fileExists');

const AWS = require('../../../../src/utils/requireAWS');

jest.mock('../../../../src/utils/requireAWS', () => ({
  S3: jest.fn(),
}));

describe('fileExists', () => {
  const listObjectSpy = jest.fn();

  const bucket = 'test-bucket';
  const prefix = 'test-key';

  beforeEach(async () => {
    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      listObjects: listObjectSpy,
    }));
  });

  it('Returns true if file exists', async () => {
    listObjectSpy.mockImplementation(() => ({
      promise: () => Promise.resolve({ Contents: [] }),
    }));

    const result = await fileExists(bucket, prefix);

    expect(result).toBe(true);
  });

  it('Returns false if file not found', async () => {
    const notFoundError = new Error('Not Found');
    Object.assign(notFoundError, { code: 'NotFound' });

    listObjectSpy.mockImplementation(() => ({
      promise: () => Promise.reject(notFoundError),
    }));

    const result = await fileExists(bucket, prefix);

    expect(result).toBe(false);
  });

  it('Returns false if there is an error checking the file', async () => {
    listObjectSpy.mockImplementation(() => ({
      promise: () => Promise.reject(new Error('Some random error')),
    }));

    const result = await fileExists(bucket, prefix);

    expect(result).toBe(false);
  });
});
