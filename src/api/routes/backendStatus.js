const getBackendStatus = require('../services/getBackendStatus');

module.exports = {
  'backend-status#get': (req, res, next) => {
    getBackendStatus(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
};
