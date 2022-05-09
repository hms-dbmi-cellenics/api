const { runGem2s, handleResponse } = require('../controllers/gem2sController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'gem2s#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => runGem2s(req, res).catch(next),
  ],
  'gem2s#response': (req, res, next) => {
    handleResponse(req, res).catch(next);
  },
};
