const SamplesService = require('../route-services/samples');

const samplesService = new SamplesService();

module.exports = {
  'samples#get': (req, res, next) => {
    samplesService.getSamples(req.params.projectUuid)
      .then((data) => res.json(data))
      .catch(next);
  },
  'samples#getByExperimentId': (req, res, next) => {
    samplesService.getByExperimentId(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
  'samples#update': (req, res, next) => {
    const { body, params: { projectUuid } } = req;
    samplesService.updateSamples(projectUuid, body)
      .then((data) => res.json(data))
      .catch(next);
  },
};
