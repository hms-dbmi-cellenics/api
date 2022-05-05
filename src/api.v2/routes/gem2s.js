const { runGem2s } = require('../controllers/gem2sController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'gem2s#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => runGem2s(req, res).catch(next),
  ],
};
