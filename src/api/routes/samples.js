const SamplesService = require('../route-services/samples');

const samplesService = new SamplesService();

module.exports = {
  'samples#get': (req, res, next) => {
    samplesService.getSamples(req.params.projectUuid)
      .then((data) => res.json(data))
      .catch(next);
  },
  'samples#getSamplesByExperimentId': (req, res, next) => {
    samplesService.getSamplesByExperimentId(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },
  'samples#update': (req, res, next) => {
    const { body, params: { projectUuid } } = req;

    samplesService.updateSamples(projectUuid, body)
      .then((data) => res.json(data))
      .catch(next);
  },
  'samples#remove': (req, res, next) => {
    const { body: { ids }, params: { projectUuid, experimentId } } = req;

    samplesService.removeSamples(projectUuid, experimentId, ids)
      .then((data) => res.json(data))
      .catch(next);
  },
  'samples#uploadSampleFileLink': (req, res, next) => {
    const { params: { projectUuid, sampleUuid, fileName } } = req;

    try {
      const uploadLink = samplesService.getS3UploadLink(projectUuid, sampleUuid, fileName);

      res.json(uploadLink);
    } catch (e) {
      next(e);
    }
  },
};
