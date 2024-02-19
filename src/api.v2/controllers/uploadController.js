import { getPartUploadSignedUrl } from '../helpers/s3/signedUrl';

const getMultipartSignedUrl = async (req, res) => {
  const { uploadId, partNumber } = req.params;
  const { bucket, key } = req.query;

  const signedUrl = getPartUploadSignedUrl(key, bucket, uploadId, partNumber);

  res.json(signedUrl);
};

// eslint-disable-next-line import/prefer-default-export
export { getMultipartSignedUrl };
