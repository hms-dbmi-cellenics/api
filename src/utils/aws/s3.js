const AWS = require('../requireAWS');

const fileExists = async (bucket, prefix) => {
  const s3 = new AWS.S3();

  // Using async/await (untested)
  const params = {
    Bucket: bucket,
    Prefix: prefix,
  };
  try {
    // ignore the result, just want to know if it exists (it will raise an exception if it doesn't)
    await s3.listObjects(params).promise();
  } catch (err) {
    if (err.code === 'NotFound') {
      return false;
    }
    // if there is an exception
    console.log(`could not check whether ${bucket}/${prefix} exists: ${err}`);
    return false;
  }
  return true;
};

module.exports = { fileExists };
