const {
  getAllExperiments, getExampleExperiments,
  createExperiment, getExperiment, patchExperiment, deleteExperiment, cloneExperiment,
  getProcessingConfig, updateProcessingConfig,
  updateSamplePosition,
  getBackendStatus, getRerunStatus, downloadData,
} = require('../controllers/experimentController');

const { expressAuthenticationOnlyMiddleware, expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'experiment#getAllExperiments': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => getAllExperiments(req, res).catch(next),
  ],
  'experiment#getExampleExperiments': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => getExampleExperiments(req, res).catch(next),
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
  'experiment#deleteExperiment': [
    expressAuthorizationMiddleware,
    (req, res, next) => deleteExperiment(req, res).catch(next),
  ],
  'experiment#updateSamplePosition': [
    expressAuthorizationMiddleware,
    (req, res, next) => updateSamplePosition(req, res).catch(next),
  ],
  'experiment#getProcessingConfig': [
    expressAuthorizationMiddleware,
    (req, res, next) => getProcessingConfig(req, res).catch(next),
  ],
  'experiment#updateProcessingConfig': [
    expressAuthorizationMiddleware,
    (req, res, next) => updateProcessingConfig(req, res).catch(next),
  ],
  'experiment#getBackendStatus': [
    expressAuthorizationMiddleware,
    (req, res, next) => getBackendStatus(req, res).catch(next),
  ],
  'experiment#getRerunStatus': [
    expressAuthorizationMiddleware,
    (req, res, next) => getRerunStatus(req, res).catch(next),
  ],
  'experiment#downloadData': [
    expressAuthorizationMiddleware,
    (req, res, next) => downloadData(req, res).catch(next),
  ],
  'experiment#clone': [
    expressAuthorizationMiddleware,
    (req, res, next) => cloneExperiment(req, res).catch(next),
  ],
};
