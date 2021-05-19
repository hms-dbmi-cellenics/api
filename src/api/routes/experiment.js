const ExperimentService = require('../route-services/experiment');
const { expressAuthorizationMiddleware, expressAuthorizationExperimentCreationMiddleware } = require('../../utils/authMiddlewares');

const experimentService = new ExperimentService();

module.exports = {
  'experiment#getExperiment': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      experimentService.getExperimentData(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#createExperiment': [
    expressAuthorizationExperimentCreationMiddleware,
    (req, res, next) => {
      experimentService.createExperiment(req.params.experimentId, req.body, req.user)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#updateExperiment': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      experimentService.updateExperiment(req.params.experimentId, req.body)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#getCellSets': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      experimentService.getCellSets(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#updateCellSets': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      experimentService.updateCellSets(req.params.experimentId, req.body)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#getProcessingConfig': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      experimentService.getProcessingConfig(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#updateProcessingConfig': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      experimentService.updateProcessingConfig(req.params.experimentId, req.body)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
};
