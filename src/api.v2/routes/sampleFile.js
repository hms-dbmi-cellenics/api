const { setFile } = require('../controllers/sampleFileController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'sampleFile#create': [
    expressAuthorizationMiddleware,
    (req, res, next) => setFile(req, res).catch(next),
  ],
};
