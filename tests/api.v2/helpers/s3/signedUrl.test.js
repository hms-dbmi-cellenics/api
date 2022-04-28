const signedUrl = require('../../../../src/api.v2/helpers/s3/signedUrl');

const { getSignedUrl, getSampleFileUploadUrl } = signedUrl;

const AWS = require('../../../../src/utils/requireAWS');

jest.mock('../../../../src/utils/requireAWS', () => ({
  S3: jest.fn(),
}));

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

describe('getSampleFileUploadUrl', () => {
  const mockSampleFileId = 'mockSampleFileId';

  const signedUrlResponse = 'signedUrl';

  const signedUrlSpy = jest.fn();

  beforeEach(() => {
    signedUrlSpy.mockReturnValueOnce(signedUrlResponse);

    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      getSignedUrl: signedUrlSpy,
    }));
  });

  it('works correctly without metadata', () => {
    const response = getSampleFileUploadUrl(mockSampleFileId, {});

    expect(response).toEqual(signedUrlResponse);
    expect(signedUrlSpy).toMatchSnapshot();
  });

  it('works correctly with metadata cellrangerVersion', () => {
    const response = getSampleFileUploadUrl(mockSampleFileId, { cellrangerVersion: 'v2' });

    expect(response).toEqual(signedUrlResponse);
    expect(signedUrlSpy).toMatchSnapshot();
  });
});
