const AWSXRay = require('aws-xray-sdk');
const { createGem2SPipeline } = require('../general-services/pipeline-manage');
const ExperimentService = require('../route-services/experiment');
const getBackendStatus = require('../general-services/backend-status');
const pipelineResponse = require('../route-services/pipeline-response');
const parseSNSMessage = require('../../utils/parse-sns-message');
const logger = require('../../utils/logging');

module.exports = {
  'gem2s#get': (req, res, next) => {
    getBackendStatus(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },

  'gem2s#create': (req, res, next) => {
    createGem2SPipeline(req.params.experimentId)
      .then((data) => {
        const experimentService = new ExperimentService();
        experimentService.savePipelineHandle(req.params.experimentId, data)
          .then(() => res.json(data));
      })
      .catch(next);
  },

  'gem2s#response': async (req, res) => {
    let result;

    try {
      result = await parseSNSMessage(req);
    } catch (e) {
      logger.error('Parsing initial SNS message failed:', e);
      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }

    const { io, parsedMessage } = result;

    try {
      await pipelineResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'Pipeline response handler failed with error: ', e,
      );

      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }

    res.status(200).send('ok');
  },
};
