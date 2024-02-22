// @ts-nocheck

const { getUploadPartSignedUrl } = require('../../../src/api.v2/controllers/uploadController');
const signedUrl = require('../../../src/api.v2/helpers/s3/signedUrl');

jest.mock('../../../src/api.v2/helpers/s3/signedUrl');

const mockRes = {
  json: jest.fn(),
};

describe('sampleFileController', () => {
  const mockSignedUrl = 'mockSignedUrl';

  const mockExperimentId = 'mockExperimentId';
  const uploadId = 'mockUploadId';
  const partNumber = 'mockPartNumber1';
  const bucket = 'mockBucket';
  const key = 'mockKey';

  beforeEach(async () => {
    jest.clearAllMocks();

    signedUrl.getPartUploadSignedUrl.mockReturnValueOnce(Promise.resolve(mockSignedUrl));
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

    expect(mockRes.json).toHaveBeenCalledWith(mockSignedUrl);
  });

  // it('createFile works correctly', async () => {
  //   const experimentId = 'experimentId';
  //   const sampleId = 'sampleId';
  //   const sampleFileType = 'features10x';

  //   const sampleFileId = 'sampleFileId';
  //   const size = 'size';
  //   const metadata = {};

  //   const mockReq = {
  //     params: { experimentId, sampleId, sampleFileType },
  //     body: { sampleFileId, size, metadata },
  //   };

  //   await sampleFileController.createFile(mockReq, mockRes);

  //   // Used with transactions
  //   expect(Sample).toHaveBeenCalledWith(mockTrx);
  //   expect(SampleFile).toHaveBeenCalledWith(mockTrx);

  //   // Not used without transactions
  //   expect(Sample).not.toHaveBeenCalledWith(mockSqlClient);
  //   expect(SampleFile).not.toHaveBeenCalledWith(mockSqlClient);

  //   expect(sampleFileInstance.create).toHaveBeenCalledWith({
  //     id: 'sampleFileId', s3_path: 'sampleFileId', sample_file_type: 'features10x', size: 'size', upload_status: 'uploading',
  //   });
  //   expect(sampleInstance.setNewFile).toHaveBeenCalledWith('sampleId', 'sampleFileId', 'features10x');

  //   // Response is generated signed url
  //   expect(mockRes.json).toHaveBeenCalledWith(OK());
  // });
});
