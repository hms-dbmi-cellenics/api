const { handleSubsetRequest } = require('../controllers/subsetController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'subset#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => handleSubsetRequest(req, res).catch(next),
  ],
};
