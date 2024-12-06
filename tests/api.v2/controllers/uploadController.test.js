// @ts-nocheck
const { getUploadPartSignedUrl } = require('../../../src/api.v2/controllers/uploadController');
const signedUrl = require('../../../src/api.v2/helpers/s3/signedUrl');

jest.mock('../../../src/api.v2/helpers/s3/signedUrl');

const mockRes = {
  json: jest.fn(),
};

describe('sampleFileController', () => {
  const mockSignedUrlResult = { url: 'mockSignedUrl', fileId: 'mockFileId' };

  const mockExperimentId = 'mockExperimentId';
  const uploadId = 'mockUploadId';
  const partNumber = 'mockPartNumber1';
  const bucket = 'mockBucket';
  const key = 'mockKey';

  beforeEach(async () => {
    jest.clearAllMocks();

    signedUrl.getPartUploadSignedUrl.mockReturnValueOnce(Promise.resolve(mockSignedUrlResult));
  });

  it('getPartUploadSignedUrl works correctly', async () => {
    const mockReq = {
      params: { mockExperimentId, uploadId, partNumber },
      query: { bucket, key },
    };

    await getUploadPartSignedUrl(mockReq, mockRes);

    expect(signedUrl.getPartUploadSignedUrl).toHaveBeenCalledWith(
      key, bucket, uploadId, partNumber,
    );

    expect(mockRes.json).toHaveBeenCalledWith(mockSignedUrlResult);
  });
});
