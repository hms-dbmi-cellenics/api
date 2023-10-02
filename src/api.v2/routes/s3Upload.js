const { completeMultipartUploads } = require('../controllers/s3Upload');

module.exports = {
  's3Upload#completeMultipartUpload': [
    (req, res, next) => completeMultipartUploads(req, res).catch(next),
  ],
};
