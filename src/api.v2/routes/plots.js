const {
  getPlotConfig,
  updatePlotConfig,
} = require('../controllers/plotController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'plots#get': [
    expressAuthorizationMiddleware,
    (req, res, next) => getPlotConfig(req, res).catch(next),
  ],
  'plots#update': [
    expressAuthorizationMiddleware,
    (req, res, next) => updatePlotConfig(req, res).catch(next),
  ],
};
