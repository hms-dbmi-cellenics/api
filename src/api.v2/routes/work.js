const getWorkResults = require('../helpers/worker/getWorkResults');
const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');
const { submitWork } = require('../controllers/workController');

module.exports = {
  'work#getWorkResults': [
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

  'work#submitRequest': [
    expressAuthorizationMiddleware,
    (req, res, next) => submitWork(req, res).catch(next),
  ],
};
