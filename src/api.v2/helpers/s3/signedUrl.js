const _ = require('lodash');

const AWS = require('../../../utils/requireAWS');
const config = require('../../../config');

const bucketNames = require('../../../config/bucketNames');
const SampleFile = require('../../model/SampleFile');
const { NotFoundError } = require('../../../utils/responses');

const getSignedUrl = async (operation, params) => {
  if (!params.Bucket) throw new Error('Bucket is required');
  if (!params.Key) throw new Error('Key is required');

  const S3Config = {
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
  };

  const s3 = new AWS.S3(S3Config);

  return s3.getSignedUrlPromise(operation, params);
};

const FILE_CHUNK_SIZE = 10000000;

const createMultipartUpload = async (params, size) => {
  if (!params.Bucket) throw new Error('Bucket is required');
  if (!params.Key) throw new Error('Key is required');

  const S3Config = {
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
  };

  const s3 = new AWS.S3(S3Config);

  const { UploadId } = await s3.createMultipartUpload(params).promise();

  const baseParams = {
    ...params,
    UploadId,
  };

  const promises = [];
  const parts = Math.ceil(size / FILE_CHUNK_SIZE);

  for (let i = 0; i < parts; i += 1) {
    promises.push(
      s3.getSignedUrlPromise('uploadPart', {
        ...baseParams,
        PartNumber: i + 1,
      }),
    );
  }

  const signedUrls = await Promise.all(promises);

  return {
    signedUrls,
    uploadId: UploadId,
  };
};


const completeMultipartUpload = async (sampleFileId, parts, uploadId) => {
  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: `${sampleFileId}`,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  };


  const S3Config = {
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
  };

  const s3 = new AWS.S3(S3Config);
  await s3.completeMultipartUpload(params).promise();
};

const getSampleFileUploadUrls = async (sampleFileId, metadata, size) => {
  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: sampleFileId,
    // 1 hour timeout of upload link
    Expires: 3600,
  };

  if (metadata.cellrangerVersion) {
    params.Metadata = {
      cellranger_version: metadata.cellrangerVersion,
    };
  }

  return await createMultipartUpload(params, size);
};

const fileNameToReturn = {
  matrix10x: 'matrix.mtx.gz',
  barcodes10x: 'barcodes.tsv.gz',
  features10x: 'features.tsv.gz',
  rhapsody: 'expression_data.st.gz',
  seurat: 'r.rds',
  '10x_h5': 'matrix.h5.gz',
};

const getSampleFileDownloadUrl = async (experimentId, sampleId, fileType) => {
  const allFiles = await new SampleFile().allFilesForSample(sampleId);

  const matchingFile = allFiles.find(({ sampleFileType }) => sampleFileType === fileType);

  if (_.isNil(matchingFile)) {
    throw new NotFoundError(`File ${fileType} from sample ${sampleId} from experiment ${experimentId} not found`);
  }

  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: matchingFile.s3Path,
    ResponseContentDisposition: `attachment; filename="${fileNameToReturn[fileType]}"`,
  };

  const signedUrl = await getSignedUrl('getObject', params);

  return signedUrl;
};

module.exports = {
  getSampleFileUploadUrls,
  getSampleFileDownloadUrl,
  getSignedUrl,
  createMultipartUpload,
  completeMultipartUpload,
};
