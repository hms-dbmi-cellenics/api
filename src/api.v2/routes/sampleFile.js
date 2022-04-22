const { createFile, patchFile } = require('../controllers/sampleFileController');

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
};
