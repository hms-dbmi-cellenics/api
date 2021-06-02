const AWSXRay = require('aws-xray-sdk');
const { createQCPipeline } = require('../general-services/pipeline-manage');
const getBackendStatus = require('../general-services/backend-status');
const ExperimentService = require('../route-services/experiment');
const pipelineResponse = require('../route-services/pipeline-response');
const parseSNSMessage = require('../../utils/parse-sns-message');
const logger = require('../../utils/logging');
const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

module.exports = {
  'pipelines#get': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      // The changes to add gem2s status will be obsoleted once agi's PR is merged in
      getBackendStatus(req.params.experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'pipelines#create': [
    (req, res, next) => {
      const { processingConfig } = req.body;

      createQCPipeline(req.params.experimentId, processingConfig || [])
        .then((data) => {
          const experimentService = new ExperimentService();
          experimentService.saveQCHandle(req.params.experimentId, data)
            .then(() => res.json(data));
        })
        .catch(next);
    },
  ],
  'pipelines#response': async (req, res) => {
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
    const isSnsNotification = parsedMessage !== undefined;
    if (isSnsNotification) {
      try {
        await pipelineResponse(io, parsedMessage);
      } catch (e) {
        logger.error(
          'qc pipeline response handler failed with error: ', e,
        );

        AWSXRay.getSegment().addError(e);
        res.status(200).send('nok');
        return;
      }
    }

    res.status(200).send('ok');
  },
};
