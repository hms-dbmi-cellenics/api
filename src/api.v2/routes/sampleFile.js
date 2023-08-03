const {
  createFile, patchFile, getS3DownloadUrl, completeMultipart,
} = require('../controllers/sampleFileController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'sampleFile#create': [
    expressAuthorizationMiddleware,
    (req, res, next) => createFile(req, res).catch(next),
  ],
  'sampleFile#patch': [
    expressAuthorizationMiddleware,
    (req, res, next) => patchFile(req, res).catch(next),
  ],
  'sampleFile#completeMultipart': [
    (req, res, next) => completeMultipart(req, res).catch(next),
  ],
  'sampleFile#downloadUrl': [
    expressAuthorizationMiddleware,
    (req, res, next) => getS3DownloadUrl(req, res).catch(next),
  ],
};
