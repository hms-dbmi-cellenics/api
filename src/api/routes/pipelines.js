const createPipeline = require('../general-services/pipeline-manage');

module.exports = {
  'pipelines#create': (req, res, next) => {
    createPipeline(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
};
