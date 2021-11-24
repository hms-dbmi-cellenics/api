const AWS = require('../requireAWS');

const fileExists = async (bucket, key) => {
  const s3 = new AWS.S3();

  // Using async/await (untested)
  const params = {
    Bucket: bucket,
    Prefix: key,
  };
  try {
    // ignore the result, just want to know if it exists (it will raise an exception if it doesn't)
    await s3.listObjects(params).promise();
  } catch (err) {
    if (err.code === 'NotFound') {
      return false;
    }
    // if there's any other exception, raise it
    throw err;
  }
  return true;
};

module.exports = { fileExists };
