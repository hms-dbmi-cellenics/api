const {
  createMetadataTrack,
} = require('../controllers/metadataTrackController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'metadataTrack#createMetadataTrack': [
    expressAuthorizationMiddleware,
    (req, res, next) => createMetadataTrack(req, res).catch(next),
  ],
};
