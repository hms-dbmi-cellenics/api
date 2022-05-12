const getWorkResults = require('../helpers/worker/getWorkResults');
const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'work#getResults': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { experimentId, ETag } = req.params;
      getWorkResults(experimentId, ETag)
        .then((result) => res.json(result))
        .catch(next);
    }],
};
