const { handleSeuratRequest } = require('../controllers/subsetController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'subset#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => handleSeuratRequest(req, res).catch(next),
  ],
};
