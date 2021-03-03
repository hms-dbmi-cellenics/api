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
    createPipeline(req.params.experimentId)
      .then((data) => res.json(data))
      .catch(next);
  },

  'pipelines#response': async (req, res, next) => {
    let result;

    try {
      result = await parseSNSMessage(req);
    } catch (e) {
      next(e);
    }

    const { io, parsedMessage } = result;

    try {
      await pipelineResponse(io, parsedMessage);
    } catch (e) {
      logger.error('Error processing the work response message:');
      logger.error(e);
    }

    res.status(200).send('ok');
  },
};
