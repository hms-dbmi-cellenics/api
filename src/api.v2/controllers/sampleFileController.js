const sqlClient = require('../../sql/sqlClient');

const Sample = require('../model/Sample');
const SampleFile = require('../model/SampleFile');
const bucketNames = require('../../config/bucketNames');

const { getSampleFileDownloadUrl, createMultipartUpload } = require('../helpers/s3/signedUrl');
const { OK, MethodNotAllowedError } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[SampleFileController] - ');

const createFile = async (req, res) => {
  const {
    params: { experimentId, sampleId, sampleFileType },
    body: { sampleFileId, size, uploadStatus = 'uploading' }, // Default uploadStatus to 'uploading'
  } = req;
  logger.log(`Creating file ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  const newSampleFile = {
    id: sampleFileId,
    sample_file_type: sampleFileType,
    size,
    s3_path: sampleFileId,
    upload_status: uploadStatus, // Use provided or default 'uploading'
  };

  await sqlClient.get().transaction(async (trx) => {
    await new SampleFile(trx).create(newSampleFile);
    await new Sample(trx).setNewFile(sampleId, sampleFileId, sampleFileType);
  });


  logger.log(`Finished creating sample file for experiment ${experimentId}, sample ${sampleId}, sampleFileType ${sampleFileType}`);

  res.json(OK());
};


const beginUpload = async (req, res) => {
  const {
    params: { experimentId, sampleFileId },
    body: { metadata },
  } = req;

  const { uploadStatus } = await new SampleFile().findById(sampleFileId).first();
  // Check that the file is already in the process of being uploaded
  // If it isn't, then it can't be reuploaded, a new file should be created
  // This is because the existing files may be shared across many experiments
  if (!['uploading', 'compressing'].includes(uploadStatus)) {
    throw new MethodNotAllowedError(
      `Sample file ${sampleFileId} is not in the process of being uploaded. 
      No sample files can be replaced in s3, to replace a file referenced by a sample, create a new file for it`,
    );
  }

  logger.log(`Creating multipart upload for ${experimentId}, sample file ${sampleFileId}`);
  const uploadParams = await createMultipartUpload(
    sampleFileId, metadata, bucketNames.SAMPLE_FILES,
  );

  res.json(uploadParams);
};

const patchFile = async (req, res) => {
  const {
    params: { experimentId, sampleFileId },
    body: { uploadStatus },
  } = req;
  logger.log(`Patching file ${sampleFileId} in experiment ${experimentId}`);

  await new SampleFile().updateUploadStatus(sampleFileId, uploadStatus);

  logger.log(`Finished patching sample file for experiment ${experimentId}, file: ${sampleFileId}`);
  res.json(OK());
};

const getS3DownloadUrl = async (req, res) => {
  const { experimentId, sampleId, sampleFileType } = req.params;

  logger.log(`Creating downloadUrl for ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  const signedUrl = await getSampleFileDownloadUrl(experimentId, sampleId, sampleFileType);

  logger.log(`Finished creating downloadUrl for ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  res.json(signedUrl);
};

module.exports = {
  createFile, beginUpload, patchFile, getS3DownloadUrl,
};
