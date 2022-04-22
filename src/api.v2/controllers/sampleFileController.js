const sqlClient = require('../../sql/sqlClient');

const Sample = require('../model/Sample');
const SampleFile = require('../model/SampleFile');

const { getSampleFileUploadUrl } = require('../helpers/s3/getSignedUrl');

const setFile = async (req, res) => {
  const {
    params: { sampleId, sampleFileType },
    body: { sampleFileId, size, metadata = null },
  } = req;

  const newSampleFile = {
    id: sampleFileId,
    sample_file_type: sampleFileType,
    size,
    s3_path: sampleFileId,
    upload_status: 'uploading',
  };

  let signedUrl;

  await sqlClient.get().transaction(async (trx) => {
    await new SampleFile(trx).create(newSampleFile);
    await new Sample(trx).setNewFile(sampleId, sampleFileId, sampleFileType);

    signedUrl = getSampleFileUploadUrl(sampleFileId, sampleFileId, metadata);
  });

  res.json(signedUrl);
};

module.exports = {
  setFile,
};
