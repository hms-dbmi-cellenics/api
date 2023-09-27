const {
  uploadCellLevelMetadata,
} = require('../controllers/cellLevelController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'cellLevel#uploadCellLevelMetadata': [
    expressAuthorizationMiddleware,
    (req, res, next) => uploadCellLevelMetadata(req, res).catch(next),
  ],
};
