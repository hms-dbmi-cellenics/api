const SamplesService = require('../route-services/samples');

const samplesService = new SamplesService();

module.exports = {
  'samples#get': (req, res, next) => {
    samplesService.getSamples(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
};
