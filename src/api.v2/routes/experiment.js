const {
  createExperiment, getExperiment, patchExperiment,
} = require('../controllers/experimentController');

const { expressAuthenticationOnlyMiddleware } = require('../../utils/authMiddlewares');

module.exports = {
  'experiment#createExperiment': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => createExperiment(req, res).catch(next),
  ],
  'experiment#getExperiment': [
    // expressAuthorizationMiddleware,
    (req, res, next) => getExperiment(req, res).catch(next),
  ],
  'experiment#patchExperiment': [
    // expressAuthorizationMiddleware,
    (req, res, next) => patchExperiment(req, res).catch(next),
  ],
};
