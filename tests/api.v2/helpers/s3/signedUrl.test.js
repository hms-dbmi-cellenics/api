// @ts-nocheck
const SampleFile = require('../../../../src/api.v2/model/SampleFile');
const signedUrl = require('../../../../src/api.v2/helpers/s3/signedUrl');

const AWS = require('../../../../src/utils/requireAWS');
const { NotFoundError } = require('../../../../src/utils/responses');

const { getSignedUrl, getSampleFileDownloadUrl, getSampleFileUploadUrls } = signedUrl;
const sampleFileInstance = new SampleFile();

jest.mock('../../../../src/api.v2/model/SampleFile');

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

describe('getSampleFileUploadUrls', () => {
  const mockSampleFileId = 'mockSampleFileId';

  const signedUrlResponse = { signedUrls: ['signedUrl'], uploadId: 'uploadId' };

  const createMultipartUploadSpy = jest.fn();
  const getSignedUrlPromiseSpy = jest.fn();

  beforeEach(() => {
    createMultipartUploadSpy.mockReturnValue({ promise: jest.fn().mockReturnValue({ UploadId: 'uploadId' }) });
    getSignedUrlPromiseSpy.mockReturnValue('signedUrl');

    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      createMultipartUpload: createMultipartUploadSpy,
      getSignedUrlPromise: getSignedUrlPromiseSpy,
    }));
  });

  it('works correctly without metadata', async () => {
    const response = await getSampleFileUploadUrls(mockSampleFileId, {}, 1);

    expect(response).toEqual(signedUrlResponse);
    expect(createMultipartUploadSpy).toMatchSnapshot();
    expect(getSignedUrlPromiseSpy).toMatchSnapshot();
  });

  it('works correctly with metadata cellrangerVersion', async () => {
    const response = await getSampleFileUploadUrls(mockSampleFileId, { cellrangerVersion: 'v2' }, 1);

    expect(response).toEqual(signedUrlResponse);
    expect(createMultipartUploadSpy).toMatchSnapshot();
    expect(getSignedUrlPromiseSpy).toMatchSnapshot();
  });
});


describe('getSampleFileDownloadUrl', () => {
  const experimentId = 'mockExperimentId';
  const sampleId = 'mockSampleId';
  const fileType = 'features10x';

  const signedUrlResponse = 'signedUrl';

  const signedUrlSpy = jest.fn();

  beforeEach(() => {
    signedUrlSpy.mockReturnValueOnce(signedUrlResponse);

    AWS.S3.mockReset();
    AWS.S3.mockImplementation(() => ({
      getSignedUrl: signedUrlSpy,
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

    const response = await getSampleFileDownloadUrl(experimentId, sampleId, fileType);

    expect(response).toEqual(signedUrlResponse);
    expect(signedUrlSpy).toMatchSnapshot();
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

    await expect(getSampleFileDownloadUrl(experimentId, sampleId, fileType)).rejects.toThrow(
      new NotFoundError(`File ${fileType} from sample ${sampleId} from experiment ${experimentId} not found`),
    );
  });
});
