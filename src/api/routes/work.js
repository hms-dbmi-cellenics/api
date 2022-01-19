const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');
const getWorkResults = require('../general-services/get-work-results');

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
