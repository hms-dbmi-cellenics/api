const {
  upload, update, download, deleteMeta,
} = require('../controllers/cellLevelMetaController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'cellLevelMeta#upload': [
    expressAuthorizationMiddleware,
    (req, res, next) => upload(req, res).catch(next),
  ],
  'cellLevelMeta#update': [
    expressAuthorizationMiddleware,
    (req, res, next) => update(req, res).catch(next),
  ],
  'cellLevelMeta#download': [
    expressAuthorizationMiddleware,
    (req, res, next) => download(req, res).catch(next),
  ],
  'cellLevelMeta#deleteMeta': [
    expressAuthorizationMiddleware,
    (req, res, next) => deleteMeta(req, res).catch(next),
  ],
};
