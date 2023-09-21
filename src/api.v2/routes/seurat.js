const { handleSeuratRequest, handleResponse } = require('../controllers/seuratController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'seurat#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => handleSeuratRequest(req, res).catch(next),
  ],
  'seurat#response': (req, res, next) => {
    handleResponse(req, res).catch(next);
  },
};
