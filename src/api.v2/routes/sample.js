const {
  createSample,
  patchSample,
  deleteSample,
  getSamples,
} = require('../controllers/sampleController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'sample#createSample': [
    expressAuthorizationMiddleware,
    (req, res, next) => createSample(req, res).catch(next),
  ],
  'sample#patchSample': [
    expressAuthorizationMiddleware,
    (req, res, next) => patchSample(req, res).catch(next),
  ],
  'sample#deleteSample': [
    expressAuthorizationMiddleware,
    (req, res, next) => deleteSample(req, res).catch(next),
  ],
  'sample#getSamples': [
    // expressAuthorizationMiddleware,
    (req, res, next) => getSamples(req, res).catch(next),
  ],
};
