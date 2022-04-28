const {
  createMetadataTrack,
  patchMetadataTrack,
  patchSampleInMetadataTrackValue,
  deleteMetadataTrack,
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
  'metadataTrack#deleteMetadataTrack': [
    expressAuthorizationMiddleware,
    (req, res, next) => deleteMetadataTrack(req, res).catch(next),
  ],
};
