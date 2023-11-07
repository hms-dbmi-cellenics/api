const {
  uploadCellLevelMetadata, updateCellLevelMetadata, downloadCellLevelFile, deleteMetadata,
} = require('../controllers/cellLevelMetaController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'cellLevelMeta#uploadCellLevelMetadata': [
    expressAuthorizationMiddleware,
    (req, res, next) => uploadCellLevelMetadata(req, res).catch(next),
  ],
  'cellLevelMeta#updateCellLevelMetadata': [
    expressAuthorizationMiddleware,
    (req, res, next) => updateCellLevelMetadata(req, res).catch(next),
  ],
  'cellLevelMeta#downloadFile': [
    expressAuthorizationMiddleware,
    (req, res, next) => downloadCellLevelFile(req, res).catch(next),
  ],
  'cellLevelMeta#deleteMetadata': [
    expressAuthorizationMiddleware,
    (req, res, next) => deleteMetadata(req, res).catch(next),
  ],
};
