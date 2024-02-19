const { getMultipartSignedUrl } = require('../controllers/uploadController');
const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'upload#getMultipartSignedUrl': [
    expressAuthorizationMiddleware,
    (req, res, next) => getMultipartSignedUrl(req, res).catch(next),
  ],
};
