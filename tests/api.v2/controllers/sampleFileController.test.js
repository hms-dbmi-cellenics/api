// @ts-nocheck
const Sample = require('../../../src/api.v2/model/Sample');
const SampleFile = require('../../../src/api.v2/model/SampleFile');
const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();
const bucketNames = require('../../../src/config/bucketNames');

const sampleInstance = new Sample();
const sampleFileInstance = new SampleFile();

const sampleFileController = require('../../../src/api.v2/controllers/sampleFileController');
const s3UploadController = require('../../../src/api.v2/controllers/s3Upload');
const { OK, MethodNotAllowedError } = require('../../../src/utils/responses');

const signedUrl = require('../../../src/api.v2/helpers/s3/signedUrl');

jest.mock('../../../src/api.v2/helpers/s3/signedUrl');
jest.mock('../../../src/api.v2/model/Sample');
jest.mock('../../../src/api.v2/model/SampleFile');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const mockRes = {
  json: jest.fn(),
};

describe('sampleFileController', () => {
  const mockUploadParams = { signedUrls: ['signedUrl1', 'signedUrl2'], fileId: 'mockfileId' };

  beforeEach(async () => {
    jest.clearAllMocks();

    signedUrl.getFileUploadUrls.mockReturnValue(Promise.resolve(mockUploadParams));
  });

  it('createFile works correctly', async () => {
    const experimentId = 'experimentId';
    const sampleId = 'sampleId';
    const sampleFileType = 'features10x';

    const sampleFileId = 'sampleFileId';
    const size = 'size';
    const metadata = {};

    const mockReq = {
      params: { experimentId, sampleId, sampleFileType },
      body: { sampleFileId, size, metadata },
    };

    await sampleFileController.createFile(mockReq, mockRes);

    // Used with transactions
    expect(Sample).toHaveBeenCalledWith(mockTrx);
    expect(SampleFile).toHaveBeenCalledWith(mockTrx);

    // Not used without transactions
    expect(Sample).not.toHaveBeenCalledWith(mockSqlClient);
    expect(SampleFile).not.toHaveBeenCalledWith(mockSqlClient);

    expect(sampleFileInstance.create).toHaveBeenCalledWith({
      id: 'sampleFileId', s3_path: 'sampleFileId', sample_file_type: 'features10x', size: 'size', upload_status: 'uploading',
    });
    expect(sampleInstance.setNewFile).toHaveBeenCalledWith('sampleId', 'sampleFileId', 'features10x');

    // Response is generated signed url
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('createFile errors out if the transaction failed', async () => {
    const experimentId = 'experimentId';
    const sampleId = 'sampleId';
    const sampleFileType = 'features10x';

    const sampleFileId = 'sampleFileId';
    const size = 'size';
    const metadata = {};

    const mockReq = {
      params: { experimentId, sampleId, sampleFileType },
      body: { sampleFileId, size, metadata },
    };

    mockSqlClient.transaction.mockImplementationOnce(() => Promise.reject(new Error()));

    await expect(
      sampleFileController.createFile(mockReq, mockRes),
    ).rejects.toThrow();

    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('beginUpload works correctly if upload status of file is compressing', async () => {
    const experimentId = 'experimentId';
    const sampleFileId = 'sampleFileId';
    const size = 10;
    const metadata = {};

    const mockReq = {
      params: { experimentId, sampleFileId },
      body: { metadata, size },
    };

    sampleFileInstance.findById.mockReturnValueOnce({ first: () => Promise.resolve({ uploadStatus: 'compressing' }) });

    await sampleFileController.beginUpload(mockReq, mockRes);

    expect(signedUrl.getFileUploadUrls).toHaveBeenCalledWith(
      sampleFileId, metadata, size, bucketNames.SAMPLE_FILES,
    );

    expect(mockRes.json).toHaveBeenCalledWith(mockUploadParams);

    expect(sampleFileInstance.findById.mock.calls).toMatchSnapshot();
  });

  it('beginUpload works correctly if upload status of file is uploading', async () => {
    const experimentId = 'experimentId';
    const sampleFileId = 'sampleFileId';
    const size = 10;
    const metadata = {};

    const mockReq = {
      params: { experimentId, sampleFileId },
      body: { metadata, size },
    };

    sampleFileInstance.findById.mockReturnValueOnce({ first: () => Promise.resolve({ uploadStatus: 'uploading' }) });

    await sampleFileController.beginUpload(mockReq, mockRes);

    expect(signedUrl.getFileUploadUrls).toHaveBeenCalledWith(
      sampleFileId, metadata, size, bucketNames.SAMPLE_FILES,
    );

    expect(mockRes.json).toHaveBeenCalledWith(mockUploadParams);

    expect(sampleFileInstance.findById.mock.calls).toMatchSnapshot();
  });

  it('beginUpload fails if upload status is not uploading or compressing', async () => {
    const experimentId = 'experimentId';
    const sampleFileId = 'sampleFileId';
    const size = 10;
    const metadata = {};

    const mockReq = {
      params: { experimentId, sampleFileId },
      body: { metadata, size },
    };

    sampleFileInstance.findById.mockReturnValueOnce({ first: () => Promise.resolve({ uploadStatus: 'uploaded' }) });

    await expect(sampleFileController.beginUpload(mockReq, mockRes)).rejects.toThrow(
      new MethodNotAllowedError(
        `Sample file ${sampleFileId} is not in the process of being uploaded. 
      No sample files can be replaced in s3, to replace a file referenced by a sample, create a new file for it`,
      ),
    );

    expect(signedUrl.getFileUploadUrls).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('patchFile works correctly', async () => {
    const experimentId = 'experimentId';
    const sampleId = 'sampleId';
    const sampleFileType = 'features10x';

    const uploadStatus = 'uploaded';

    const mockReq = {
      params: { experimentId, sampleId, sampleFileType },
      body: { uploadStatus },
    };

    await sampleFileController.patchFile(mockReq, mockRes);

    // Used with normal client
    expect(SampleFile).toHaveBeenCalled();

    expect(sampleFileInstance.updateUploadStatus).toHaveBeenCalledWith('sampleId', 'features10x', uploadStatus);

    // Response is generated signed url
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('getS3DownloadUrl works correctly', async () => {
    const experimentId = 'experimentId';
    const sampleId = 'sampleId';
    const sampleFileType = 'features10x';
    const uploadStatus = 'uploaded';

    const mockReq = {
      params: { experimentId, sampleId, sampleFileType },
      body: { uploadStatus },
    };

    const signedUrlString = 'mockSignedUrl';
    signedUrl.getSampleFileDownloadUrl.mockImplementationOnce(
      () => Promise.resolve(signedUrlString),
    );

    await sampleFileController.getS3DownloadUrl(mockReq, mockRes);

    expect(signedUrl.getSampleFileDownloadUrl).toHaveBeenCalledWith(
      experimentId, sampleId, sampleFileType,
    );

    // Response is generated signed url
    expect(mockRes.json).toHaveBeenCalledWith(signedUrlString);
  });

  it('completeMultipart works correctly', async () => {
    const sampleFileId = 'sampleFileId';
    const uploadId = 'uploadId';
    const parts = [];


    const mockReq = {
      body: {
        fileId: sampleFileId, parts, uploadId, type: 'sample',
      },
    };

    signedUrl.completeMultipartUpload.mockImplementationOnce(
      () => Promise.resolve(undefined),
    );

    await s3UploadController.completeMultipartUploads(mockReq, mockRes);

    expect(signedUrl.completeMultipartUpload).toHaveBeenCalledWith(
      sampleFileId, parts, uploadId, bucketNames.SAMPLE_FILES,
    );
  });
});
