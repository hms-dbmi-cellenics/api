const { getPartUploadSignedUrl } = require('../helpers/s3/signedUrl');

const getMultipartSignedUrl = async (req, res) => {
  const { uploadId, partNumber } = req.params;
  const { bucket, key } = req.query;

  const signedUrl = await getPartUploadSignedUrl(key, bucket, uploadId, partNumber);

  console.log('signedUrlDebug');
  console.log(signedUrl);

  res.json(signedUrl);
};

module.exports = { getMultipartSignedUrl };
