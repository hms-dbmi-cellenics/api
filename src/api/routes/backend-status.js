const getBackendStatus = require('../general-services/backend-status');

module.exports = {
  'backend-status#get': (req, res, next) => {
    getBackendStatus(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
};
