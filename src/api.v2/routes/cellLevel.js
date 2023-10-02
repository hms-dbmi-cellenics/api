const {
  uploadCellLevelMetadata, updateCellLevelMetadata,
} = require('../controllers/cellLevelController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'cellLevel#uploadCellLevelMetadata': [
    expressAuthorizationMiddleware,
    (req, res, next) => uploadCellLevelMetadata(req, res).catch(next),
  ],
  'cellLevel#updateCellLevelMetadata': [
    expressAuthorizationMiddleware,
    (req, res, next) => updateCellLevelMetadata(req, res).catch(next),
  ],
};
