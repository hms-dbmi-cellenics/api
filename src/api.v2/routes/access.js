const {
  getExperimentUsers,
} = require('../controllers/accessController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'access#getExperimentUsers': [
    expressAuthorizationMiddleware,
    (req, res, next) => getExperimentUsers(req, res).catch(next),
  ],
};
