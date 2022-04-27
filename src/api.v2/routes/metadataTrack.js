const {
  createMetadataTrack,
  patchMetadataTrack,
  patchSampleInMetadataTrackValue,
} = require('../controllers/metadataTrackController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'metadataTrack#createMetadataTrack': [
    expressAuthorizationMiddleware,
    (req, res, next) => createMetadataTrack(req, res).catch(next),
  ],
  'metadataTrack#patchMetadataTrack': [
    expressAuthorizationMiddleware,
    (req, res, next) => patchMetadataTrack(req, res).catch(next),
  ],
  'metadataTrack#patchSampleInMetadataTrackValue': [
    expressAuthorizationMiddleware,
    (req, res, next) => patchSampleInMetadataTrackValue(req, res).catch(next),
  ],
};
