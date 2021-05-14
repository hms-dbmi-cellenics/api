const ExperimentService = require('../route-services/experiment');

const experimentService = new ExperimentService();

module.exports = {
  'experiment#getExperiment': (req, res, next) => {
    experimentService.getExperimentData(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
  'experiment#updateExperiment': (req, res, next) => {
    experimentService.updateExperiment(req.params.experimentId, req.body)
      .then((data) => res.json(data))
      .catch(next);
  },
  'experiment#getCellSets': (req, res, next) => {
    experimentService.getCellSets(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
  'experiment#updateCellSets': (req, res, next) => {
    experimentService.updateCellSets(req.params.experimentId, req.body)
      .then((data) => res.json(data))
      .catch(next);
  },
  'experiment#getProcessingConfig': (req, res, next) => {
    experimentService.getProcessingConfig(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
  'experiment#updateProcessingConfig': (req, res, next) => {
    experimentService.updateProcessingConfig(req.params.experimentId, req.body)
      .then((data) => res.json(data))
      .catch(next);
  },
};
