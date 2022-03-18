const {
  createExperiment,
} = require('../controllers/experimentController');

const { expressAuthenticationOnlyMiddleware } = require('../../utils/authMiddlewares');

module.exports = {
  'experiment#createExperiment': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => createExperiment(req, res).catch(next),
  ],
};
