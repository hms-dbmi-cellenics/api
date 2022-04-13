const {
  createExperiment, getExperiment, patchExperiment, updateSamplePosition,
  getAllExperiments, getProcessingConfig, updateProcessingConfig,
} = require('../controllers/experimentController');

const { expressAuthenticationOnlyMiddleware, expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'experiment#getAllExperiments': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => getAllExperiments(req, res).catch(next),
  ],
  'experiment#getExperiment': [
    expressAuthorizationMiddleware,
    (req, res, next) => getExperiment(req, res).catch(next),
  ],
  'experiment#createExperiment': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => createExperiment(req, res).catch(next),
  ],
  'experiment#patchExperiment': [
    expressAuthorizationMiddleware,
    (req, res, next) => patchExperiment(req, res).catch(next),
  ],
  'experiment#updateSamplePosition': [
    expressAuthorizationMiddleware,
    (req, res, next) => updateSamplePosition(req, res).catch(next),
  ],
  'experiment#getProcessingConfig': [
    // expressAuthorizationMiddleware,
    (req, res, next) => getProcessingConfig(req, res).catch(next),
  ],
  'experiment#updateProcessingConfig': [
    expressAuthorizationMiddleware,
    (req, res, next) => updateProcessingConfig(req, res).catch(next),
  ],
};
