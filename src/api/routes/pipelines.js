const PipelinesService = require('../route-services/pipelines');

const pipelinesService = new PipelinesService();

module.exports = {
  'pipelines#create': (req, res, next) => {
    pipelinesService.create(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
};
