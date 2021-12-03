const getSignedS3Url = require('../../src/utils/getS3SignedUrl');
const { mockS3GetSignedUrl } = require('../test-utils/mockAWSServices');

const testParams = {
  Bucket: 'test-bucket',
  Key: 'test-key',
};

describe('S3 URL', () => {
  it('Should call S3 signed url correctly', () => {
    const signedUrlSpy = mockS3GetSignedUrl();

    const expectedParams = {
      ...testParams,
      Expires: 120,
    };

    getSignedS3Url('getObject', testParams);
    expect(signedUrlSpy).toHaveBeenCalledWith('getObject', expectedParams);
  });

  it('Should throw an error if bucket is not defined', () => {
    expect(() => {
      getSignedS3Url('test-bucket', { Key: 'test-key' });
    }).toThrow();
  });

  it('Should throw an error if key is not defined', () => {
    expect(() => {
      getSignedS3Url('test-bucket', { Bucet: 'test-bucket' });
    }).toThrow();
  });
});
