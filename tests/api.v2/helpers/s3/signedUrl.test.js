// @ts-nocheck
const SampleFile = require('../../../../src/api.v2/model/SampleFile');
const signedUrl = require('../../../../src/api.v2/helpers/s3/signedUrl');
const bucketNames = require('../../../../src/config/bucketNames');

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

  it('routes a sample file (non-spatial) to the SAMPLE_FILES bucket', async () => {
    const files = [
      {
        id: 'id0', sampleFileType: 'features10x', size: 12, s3Path: 'features-path', uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await getSampleFileDownloadUrls(experimentId, sampleId, 'features10x');

    expect(getSignedUrlPromiseSpy).toHaveBeenCalledWith('getObject', expect.objectContaining({
      Bucket: bucketNames.SAMPLE_FILES,
      Key: 'features-path',
      ResponseContentDisposition: 'attachment; filename="features.tsv.gz"',
    }));
  });

  it('routes ome_zarr_zip to the SPATIAL_IMAGES bucket', async () => {
    const files = [
      {
        id: 'id0', sampleFileType: 'ome_zarr_zip', size: 12, s3Path: 'image-path', uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await getSampleFileDownloadUrls(experimentId, sampleId, 'ome_zarr_zip');

    expect(getSignedUrlPromiseSpy).toHaveBeenCalledWith('getObject', expect.objectContaining({
      Bucket: bucketNames.SPATIAL_IMAGES,
      Key: 'image-path',
      ResponseContentDisposition: 'attachment; filename="image.ome.zarr.zip"',
    }));
  });

  it('routes segmentations_ome_zarr_zip to the SPATIAL_SEGMENTATIONS bucket', async () => {
    const files = [
      {
        id: 'id0', sampleFileType: 'segmentations_ome_zarr_zip', size: 12, s3Path: 'seg-path', uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await getSampleFileDownloadUrls(experimentId, sampleId, 'segmentations_ome_zarr_zip');

    expect(getSignedUrlPromiseSpy).toHaveBeenCalledWith('getObject', expect.objectContaining({
      Bucket: bucketNames.SPATIAL_SEGMENTATIONS,
      Key: 'seg-path',
      ResponseContentDisposition: 'attachment; filename="segmentations.ome.zarr.zip"',
    }));
  });

  it.each([
    ['visium_hd_filtered_feature_cell_matrix', 'filtered_feature_cell_matrix.h5'],
    ['visium_hd_cell_segmentations', 'cell_segmentations.geojson'],
    ['visium_hd_tissue_hires_image', 'tissue_hires_image.png'],
    ['visium_hd_scalefactors_json', 'scalefactors_json.json'],
  ])('uses the correct download filename for visium_hd file type %s (defaulting to SAMPLE_FILES bucket)', async (type, expectedFileName) => {
    const files = [
      {
        id: 'id0', sampleFileType: type, size: 12, s3Path: `${type}-path`, uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await getSampleFileDownloadUrls(experimentId, sampleId, type);

    expect(getSignedUrlPromiseSpy).toHaveBeenCalledWith('getObject', expect.objectContaining({
      Bucket: bucketNames.SAMPLE_FILES,
      ResponseContentDisposition: `attachment; filename="${expectedFileName}"`,
    }));
  });

  it.each([
    ['xenium_cell_feature_matrix', 'cell_feature_matrix.h5'],
    ['xenium_cells', 'cells.parquet'],
    ['xenium_cell_boundaries', 'cell_boundaries.parquet'],
  ])('uses the correct download filename for xenium file type %s and routes to the SAMPLE_FILES bucket', async (type, expectedFileName) => {
    const files = [
      {
        id: 'id0', sampleFileType: type, size: 12, s3Path: `${type}-path`, uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await getSampleFileDownloadUrls(experimentId, sampleId, type);

    expect(getSignedUrlPromiseSpy).toHaveBeenCalledWith('getObject', expect.objectContaining({
      Bucket: bucketNames.SAMPLE_FILES,
      Key: `${type}-path`,
      ResponseContentDisposition: `attachment; filename="${expectedFileName}"`,
    }));
  });

  it('uses the correct download filename for xenium_transcripts and routes to the SAMPLE_FILES bucket', async () => {
    const files = [
      {
        id: 'id0', sampleFileType: 'xenium_transcripts', size: 12, s3Path: 'xenium_transcripts-path', uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await getSampleFileDownloadUrls(experimentId, sampleId, 'xenium_transcripts');

    expect(getSignedUrlPromiseSpy).toHaveBeenCalledWith('getObject', expect.objectContaining({
      Bucket: bucketNames.SAMPLE_FILES,
      Key: 'xenium_transcripts-path',
      ResponseContentDisposition: 'attachment; filename="transcripts.parquet"',
    }));
  });

  it('uses the correct download filename for molecules_by_gene and routes to the SPATIAL_MOLECULES bucket', async () => {
    const files = [
      {
        id: 'id0', sampleFileType: 'molecules_by_gene', size: 12, s3Path: 'molecules_by_gene-path', uploadStatus: 'uploaded', uploadedAt: '1',
      },
    ];

    sampleFileInstance.allFilesForSample.mockImplementationOnce(() => Promise.resolve(files));

    await getSampleFileDownloadUrls(experimentId, sampleId, 'molecules_by_gene');

    expect(getSignedUrlPromiseSpy).toHaveBeenCalledWith('getObject', expect.objectContaining({
      Bucket: bucketNames.SPATIAL_MOLECULES,
      Key: 'molecules_by_gene-path',
      ResponseContentDisposition: 'attachment; filename="molecules.bygene.zip"',
    }));
  });
});
