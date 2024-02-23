const { getUploadPartSignedUrl } = require('../controllers/uploadController');
const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'upload#getUploadPartSignedUrl': [
    expressAuthorizationMiddleware,
    (req, res, next) => getUploadPartSignedUrl(req, res).catch(next),
  ],
};
