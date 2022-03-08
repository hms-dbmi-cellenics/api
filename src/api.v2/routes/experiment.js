const {
  // getExperimentDetails,
  createExperiment,
} = require('../controllers/experimentController');

module.exports = {
  // 'experiment#getExperiment': [
  //   expressAuthorizationMiddleware,
  //   getExperimentDetails,
  // ],
  'experiment#createExperiment': [
    (req, res, next) => createExperiment(req, res).catch(next),
  ],
  // 'experiment#updateExperiment': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     experimentService.updateExperiment(req.params.experimentId, req.body)
  //       .then((data) => res.json(data))
  //       .catch(next);
  //   },
  // ],
  // 'experiment#getCellSets': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     experimentService.getCellSets(req.params.experimentId)
  //       .then((data) => res.json(data))
  //       .catch(next);
  //   },
  // ],
  // 'experiment#patchCellSets': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     experimentService.patchCellSets(req.params.experimentId, req.body)
  //       .then((data) => res.json(data))
  //       .catch(next);
  //   },
  // ],

  // 'experiment#getProcessingConfig': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     experimentService.getProcessingConfig(req.params.experimentId)
  //       .then((data) => res.json(data))
  //       .catch(next);
  //   },
  // ],
  // 'experiment#updateProcessingConfig': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     experimentService.updateProcessingConfig(req.params.experimentId, req.body)
  //       .then((data) => res.json(data))
  //       .catch(next);
  //   },
  // ],
  // 'experiment#downloadData': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     experimentService.downloadData(req.params.experimentId, req.params.type)
  //       .then((data) => res.json(data))
  //       .catch(next);
  //   },
  // ],
};
