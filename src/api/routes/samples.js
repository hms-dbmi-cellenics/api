const SamplesService = require('../services/SamplesService');

const samplesService = new SamplesService();

const {
  expressAuthorizationMiddleware,
} = require('../../utils/authMiddlewares');

module.exports = {
  'samples#get': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      samplesService.getSamples(req.params.projectUuid)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'samples#getSamplesByExperimentId': [
    expressAuthorizationMiddleware, (req, res, next) => {
      samplesService.getSamplesByExperimentId(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'samples#update': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { body, params: { projectUuid, experimentId } } = req;

      samplesService.updateSamples(projectUuid, experimentId, body)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'samples#remove': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { body: { ids }, params: { projectUuid, experimentId } } = req;

      samplesService.removeSamples(projectUuid, experimentId, ids)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'samples#add': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      samplesService.addSample(req.params.projectUuid, req.params.experimentId, req.body)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'samples#uploadSampleFileUrl': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { params: { projectUuid, sampleUuid, fileName }, query } = req;

      try {
        const { cellranger_version = undefined } = query;

        const uploadUrl = samplesService
          .getS3UploadUrl(projectUuid, sampleUuid, fileName, cellranger_version);

        res.json(uploadUrl);
      } catch (e) {
        next(e);
      }
    }],
  'samples#downloadSampleFileUrl': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { projectUuid, sampleUuid, fileName } = req.params;

      try {
        const downloadUrl = samplesService
          .getS3DownloadUrl(projectUuid, sampleUuid, fileName);

        res.json(downloadUrl);
      } catch (e) {
        next(e);
      }
    }],
};
