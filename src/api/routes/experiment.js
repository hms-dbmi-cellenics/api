const ExperimentService = require('../route-services/experiment');
const { authorizationMiddleware } = require('../../utils/authMiddlewares');

const experimentService = new ExperimentService();

module.exports = {
  'experiment#findByID': [
    authorizationMiddleware,
    (req, res, next) => {
      experimentService.getExperimentData(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#getCellSets': [
    authorizationMiddleware,
    (req, res, next) => {
      experimentService.getCellSets(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#updateCellSets': [
    authorizationMiddleware,
    (req, res, next) => {
      experimentService.updateCellSets(req.params.experimentId, req.body)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#getProcessingConfig': [
    authorizationMiddleware,
    (req, res, next) => {
      experimentService.getProcessingConfig(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'experiment#updateProcessingConfig': [
    authorizationMiddleware,
    (req, res, next) => {
      experimentService.updateProcessingConfig(req.params.experimentId, req.body)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
};
