const AWSXRay = require('aws-xray-sdk');
const { createQCPipeline } = require('../general-services/pipeline-manage');
const getBackendStatus = require('../general-services/backend-status');
const ExperimentService = require('../route-services/experiment');
const pipelineResponse = require('../route-services/pipeline-response');
const parseSNSMessage = require('../../utils/parse-sns-message');
const logger = require('../../utils/logging').defaultLogger;
const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

module.exports = {
  'pipelines#get': [
    expressAuthorizationMiddleware,
    async (req, res) => {
      // The changes to add gem2s status will be obsoleted once agi's PR is merged in
      const data = await getBackendStatus(req.params.experimentId);
      res.json(data);
    },
  ],
  'pipelines#create': [
    async (req, res) => {
      const { processingConfig } = req.body;

      const data = await createQCPipeline(req.params.experimentId, processingConfig || []);
      const experimentService = new ExperimentService();
      await experimentService.saveQCHandle(req.params.experimentId, data);
      res.json(data);
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
