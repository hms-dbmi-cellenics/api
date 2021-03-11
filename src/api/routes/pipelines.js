const createPipeline = require('../general-services/pipeline-manage');
const getBackendStatus = require('../general-services/backend-status');
const pipelineResponse = require('../route-services/pipeline-response');
const parseSNSMessage = require('../../utils/parse-sns-message');
const logger = require('../../utils/logging');

module.exports = {
  'pipelines#get': (req, res, next) => {
    getBackendStatus(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },

  'pipelines#create': (req, res, next) => {
    const { processingConfig } = req.body;

    createPipeline(req.params.experimentId, processingConfig)
      .then((data) => res.json(data))
      .catch(next);
  },

  'pipelines#response': async (req, res) => {
    let result;

    try {
      result = await parseSNSMessage(req);
    } catch (e) {
      logger.error('Parsing initial SNS message failed:', e);

      res.status(400).send('nok');
      return;
    }

    const { io, parsedMessage } = result;

    try {
      await pipelineResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'Pipeline response handler failed with error: ', e,
      );

      res.status(500).send('nok');
      return;
    }

    res.status(200).send('ok');
  },
};
