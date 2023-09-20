const { getWorkResults, tryFetchFromS3 } = require('../helpers/worker/getWorkResults');
const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'work#getResults': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { experimentId } = req.params;
      const {
        body,
        extras,
        extraDependencies,
        disableCache,
      } = req.body;
      getWorkResults(
        experimentId,
        body,
        extras,
        extraDependencies,
        disableCache,
      )
        .then((result) => res.json(result))
        .catch(next);
    }],
  'work#getSignedUrl': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { experimentId, ETag } = req.params;
      tryFetchFromS3(experimentId, ETag)
        .then((result) => res.json(result))
        .catch(next);
    }],
};
