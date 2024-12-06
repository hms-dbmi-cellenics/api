// @ts-nocheck
const SampleFile = require('../../../../src/api.v2/model/SampleFile');
const signedUrl = require('../../../../src/api.v2/helpers/s3/signedUrl');

const AWS = require('../../../../src/utils/requireAWS');
const { NotFoundError } = require('../../../../src/utils/responses');

const {
  getSignedUrl, getSampleFileDownloadUrls, completeMultipartUpload,
} = signedUrl;
const sampleFileInstance = new SampleFile();

jest.mock('../../../../src/api.v2/model/SampleFile');

jest.mock('../../../../src/utils/requireAWS', () => ({
  S3: jest.fn(),
}));

describe('getSignedUrl', () => {
  const signedUrlPromiseSpy = jest.fn();

  const testParams = {
    Bucket: 'test-bucket',
    Key: 'test-key',
  };

  beforeEach(() => {
    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      getSignedUrlPromise: signedUrlPromiseSpy,
    }));
  });

  it('Should call S3 signed url correctly', () => {
    getSignedUrl('getObject', testParams);
    expect(signedUrlPromiseSpy).toHaveBeenCalledWith('getObject', testParams);
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
    expect(getSignedUrl('test-bucket', { Key: 'test-key' })).rejects.toThrow();
  });

  it('Should throw an error if key is not defined', () => {
    expect(getSignedUrl('test-bucket', { Bucet: 'test-bucket' })).rejects.toThrow();
  });
});

describe('completeMultipartUpload', () => {
  const mockSampleFileId = 'mockSampleFileId';
  const mockParts = [];
  const mockUploadId = 'uploadId';

  const completeMultipartUploadSpy = jest.fn();

  beforeEach(() => {
    completeMultipartUploadSpy.mockReturnValue({ promise: jest.fn().mockReturnValue() });

    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      completeMultipartUpload: completeMultipartUploadSpy,
    }));
  });

  it('works correctly ', async () => {
    const response = await completeMultipartUpload(mockSampleFileId, mockParts, mockUploadId, 'some-bucket');

    expect(response).toBeUndefined();
    expect(completeMultipartUploadSpy).toMatchSnapshot();
  });
});

describe('getPartUploadSignedUrl', () => {
  const signedUrlPromiseSpy = jest.fn();

  beforeEach(() => {
    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      getSignedUrlPromise: signedUrlPromiseSpy,
    }));
  });

  it('works correctly', async () => {
    const mockSignedUrl = 'mockSignedUrl';
    signedUrlPromiseSpy.mockResolvedValueOnce(mockSignedUrl);

    const key = 'mockKey';
    const bucketName = 'mockBucket';
    const uploadId = 'mockUploadId';
    const partNumber = 'mockPartNumber';

    const response = await signedUrl.getPartUploadSignedUrl(key, bucketName, uploadId, partNumber);

    expect(response).toEqual(mockSignedUrl);
  });
});

describe('getSampleFileDownloadUrls', () => {
  const experimentId = 'mockExperimentId';
  const sampleId = 'mockSampleId';
  const fileType = 'features10x';

  const signedUrlResponse = 'signedUrl';

  const getSignedUrlPromiseSpy = jest.fn();

  beforeEach(() => {
    getSignedUrlPromiseSpy.mockReturnValueOnce(signedUrlResponse);

    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      getSignedUrlPromise: getSignedUrlPromiseSpy,
    }));
  });

  it('works correctly', async () => {
    const files = [
      {
        id: 'id1', sampleFileType: 'matrix10x', size: 12, s3Path: '124', uploadStatus: 'uploaded', uploadedAt: '2',
      },
      {
        id: 'id0', sampleFileType: 'features10x', size: 12, s3Path: '123', uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    const response = await getSampleFileDownloadUrls(experimentId, sampleId, fileType);

    expect(response).toEqual([{ url: signedUrlResponse, fileId: 'id0' }]);
    expect(getSignedUrlPromiseSpy).toMatchSnapshot();
  });

  it('Throws not found if it doesnt find a matching file', async () => {
    const files = [
      {
        id: 'id1', sampleFileType: 'matrix10x', size: 12, s3Path: '124', uploadStatus: 'uploaded', uploadedAt: '2',
      },
      {
        id: 'id0', sampleFileType: 'barcodes10x', size: 12, s3Path: '123', uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await expect(getSampleFileDownloadUrls(experimentId, sampleId, fileType)).rejects.toThrow(
      new NotFoundError(`File ${fileType} from sample ${sampleId} from experiment ${experimentId} not found`),
    );
  });
});
