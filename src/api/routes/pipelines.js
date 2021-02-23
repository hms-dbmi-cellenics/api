const createPipeline = require('../general-services/pipeline-manage');
const getBackendStatus = require('../general-services/backend-status');

module.exports = {

  'pipelines#get': (req, res, next) => {
    getBackendStatus(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },

  'pipelines#create': (req, res, next) => {
    createPipeline(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
};
