const { getPartUploadSignedUrl } = require('../helpers/s3/signedUrl');

const getUploadPartSignedUrl = async (req, res) => {
  const { uploadId, partNumber } = req.params;
  const { bucket, key } = req.query;

  const signedUrl = await getPartUploadSignedUrl(key, bucket, uploadId, partNumber);

  res.json(signedUrl);
};

module.exports = { getUploadPartSignedUrl };
