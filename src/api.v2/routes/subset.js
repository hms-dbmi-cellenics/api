const { runSubset } = require('../controllers/subsetController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'subset#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => runSubset(req, res).catch(next),
  ],
  // 'subset#response': (req, res, next) => {
  //   handleResponse(req, res).catch(next);
  // },
};
