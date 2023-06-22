const { runSeurat, handleResponse } = require('../controllers/seuratController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'seurat#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => runSeurat(req, res).catch(next),
  ],
  'seurat#response': (req, res, next) => {
    handleResponse(req, res).catch(next);
  },
};
