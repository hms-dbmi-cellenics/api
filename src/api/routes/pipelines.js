const AWSXRay = require('aws-xray-sdk');
const { createQCPipeline } = require('../services/pipelines/manage');
const getBackendStatus = require('../services/getBackendStatus');
const ExperimentService = require('../services/experiments/ExperimentService');
const PipelineService = require('../services/pipelines/PipelineService');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const getLogger = require('../../utils/getLogger');
const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

const logger = getLogger();

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
    expressAuthorizationMiddleware,
    async (req, res) => {
      const { processingConfig } = req.body;

      const data = await createQCPipeline(
        req.params.experimentId,
        processingConfig || [],
        req.headers.authorization,
      );

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
        await PipelineService.qcResponse(io, parsedMessage);
      } catch (e) {
        logger.error(
          'pipeline response handler failed with error: ', e,
        );

        AWSXRay.getSegment().addError(e);
        res.status(200).send('nok');
        return;
      }
    }

    res.status(200).send('ok');
  },
};
