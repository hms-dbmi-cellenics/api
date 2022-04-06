const {
  createSample,
  deleteSample,
} = require('../controllers/sampleController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'sample#createSample': [
    expressAuthorizationMiddleware,
    (req, res, next) => createSample(req, res).catch(next),
  ],
  'sample#deleteSample': [
    // expressAuthorizationMiddleware,
    (req, res, next) => deleteSample(req, res).catch(next),
  ],
};
