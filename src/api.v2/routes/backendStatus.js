const { getBackendStatus } = require('../controllers/backendStatusController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'backendStatus#get': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      getBackendStatus(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
};
