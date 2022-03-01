const { fileExists, getSignedUrl } = require('../../../src/utils/aws/s3');

const AWS = require('../../../src/utils/aws/requireAWS');

jest.mock('../../../src/utils/requireAWS', () => ({
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

describe('getSignedUrl', () => {
  const signedUrlSpy = jest.fn();

  const testParams = {
    Bucket: 'test-bucket',
    Key: 'test-key',
  };

  beforeEach(() => {
    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      getSignedUrl: signedUrlSpy,
    }));
  });

  it('Should call S3 signed url correctly', () => {
    getSignedUrl('getObject', testParams);
    expect(signedUrlSpy).toHaveBeenCalledWith('getObject', testParams);
  });

  it('Should add the region config if the requested url is doing upload', () => {
    const expectedConfig = {
      region: 'eu-west-1',
    };

    getSignedUrl('putObject', testParams);

    // Expect config to have region
    expect(AWS.S3).toHaveBeenCalledWith(expect.objectContaining(expectedConfig));
  });

  it('Should add the region config if the requested url is not doing upload too', () => {
    const expectedConfig = {
      region: 'eu-west-1',
    };

    getSignedUrl('getObject', testParams);

    // Expect config to have region
    expect(AWS.S3).toHaveBeenCalledWith(expect.objectContaining(expectedConfig));
  });

  it('Should throw an error if bucket is not defined', () => {
    expect(() => {
      getSignedUrl('test-bucket', { Key: 'test-key' });
    }).toThrow();
  });

  it('Should throw an error if key is not defined', () => {
    expect(() => {
      getSignedUrl('test-bucket', { Bucet: 'test-bucket' });
    }).toThrow();
  });
});
