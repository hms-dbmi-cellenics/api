const {
  getCellSets,
  patchCellSets,
} = require('../controllers/cellSetsController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'cellSets#getCellSets': [
    expressAuthorizationMiddleware,
    (req, res, next) => getCellSets(req, res).catch(next),
  ],
  'cellSets#patchCellSets': [
    expressAuthorizationMiddleware,
    (req, res, next) => patchCellSets(req, res).catch(next),
  ],
};
