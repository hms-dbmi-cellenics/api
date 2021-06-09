const AWSXRay = require('aws-xray-sdk');
const crypto = require('crypto');

const { createGem2SPipeline } = require('../general-services/pipeline-manage');
const ExperimentService = require('../route-services/experiment');
const gem2sResponse = require('../route-services/gem2s-response');
const parseSNSMessage = require('../../utils/parse-sns-message');
const logger = require('../../utils/logging');

const ProjectService = require('../route-services/projects');
const getPipelineStatus = require('../general-services/pipeline-status');

const { GEM2S_PROCESS_NAME, RUNNING, SUCCEEDED } = require('../general-services/pipeline-manage/constants');

const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');
const { OK } = require('../../utils/responses');

const gem2sNeedsRunning = async (experimentId, paramsHash) => {
  logger.log('Checking if gem2s should actually be re run');

  const experimentService = new ExperimentService();

  const handlesPromise = experimentService.getPipelinesHandles(experimentId);
  const statusPromise = getPipelineStatus(experimentId, GEM2S_PROCESS_NAME);

  const [handles, statusWrapper] = await Promise.all([handlesPromise, statusPromise]);

  const { [GEM2S_PROCESS_NAME]: gem2sHandle } = handles;
  const { [GEM2S_PROCESS_NAME]: { status: gem2sStatus } } = statusWrapper;

  if (gem2sStatus === SUCCEEDED) {
    return paramsHash !== gem2sHandle.paramsHash;
  }

  return gem2sStatus !== RUNNING;
};

module.exports = {
  'gem2s#create': [
    expressAuthorizationMiddleware,
    async (req, res) => {
      const { experimentId } = req.params;

      const taskParams = await (new ProjectService()).getGem2sParams(experimentId);

      const paramsHash = crypto
        .createHash('sha1')
        .update(JSON.stringify(taskParams))
        .digest('hex');

      const shouldRun = await gem2sNeedsRunning(experimentId, paramsHash);

      if (!shouldRun) {
        logger.log('Gem2s create call ignored');
        res.json(OK());
        return;
      }

      logger.log('Running new gem2s pipeline');

      const newHandle = await createGem2SPipeline(req.params.experimentId, taskParams, paramsHash);

      const experimentService = new ExperimentService();
      await experimentService.saveGem2sHandle(
        req.params.experimentId,
        { paramsHash, ...newHandle },
      );

      res.json(newHandle);
    },
  ],

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
    const isSnsNotification = parsedMessage !== undefined;
    if (isSnsNotification) {
      try {
        await gem2sResponse(io, parsedMessage);
      } catch (e) {
        logger.error(
          'gem2s pipeline response handler failed with error: ', e,
        );

        AWSXRay.getSegment().addError(e);
        res.status(200).send('nok');
        return;
      }
    }

    res.status(200).send('ok');
  },
};
