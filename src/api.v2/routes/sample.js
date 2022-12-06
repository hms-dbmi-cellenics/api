const {
  createSamples,
  patchSample,
  deleteSample,
  getSamples,
  updateSamplesOptions,
} = require('../controllers/sampleController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'sample#createSamples': [
    expressAuthorizationMiddleware,
    (req, res, next) => createSamples(req, res).catch(next),
  ],
  'sample#patchSample': [
    expressAuthorizationMiddleware,
    (req, res, next) => patchSample(req, res).catch(next),
  ],
  'samples#updateSamplesOptions': [
    expressAuthorizationMiddleware,
    (req, res, next) => updateSamplesOptions(req, res).catch(next),
  ],
  'sample#deleteSample': [
    expressAuthorizationMiddleware,
    (req, res, next) => deleteSample(req, res).catch(next),
  ],
  'sample#getSamples': [
    expressAuthorizationMiddleware,
    (req, res, next) => getSamples(req, res).catch(next),
  ],
};
