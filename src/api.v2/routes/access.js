const {
  getExperimentUsers,
} = require('../controllers/accessController');

const { expressAuthenticationOnlyMiddleware, expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'access#getExperimentUsers': [
    expressAuthenticationOnlyMiddleware,
    expressAuthorizationMiddleware,
    (req, res, next) => getExperimentUsers(req, res).catch(next),
  ],
};
