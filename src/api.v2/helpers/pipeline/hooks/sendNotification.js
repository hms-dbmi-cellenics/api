const { authenticationMiddlewareSocketIO } = require('../../../middlewares/authMiddlewares');

const {
  SUCCEEDED, FAILED, QC_PROCESS_NAME,
} = require('../constants');

const getPipelineStatus = require('../getPipelineStatus');
const Experiment = require('../../../model/Experiment');

const getLogger = require('../../../../utils/getLogger');
const sendEmail = require('../../../../utils/sendEmail');
const sendFailedSlackMessage = require('../../../../utils/send-failed-slack-message');
// const config = require('../../../../config');
const buildPipelineStatusEmailBody = require('../../../../utils/emailTemplates/buildPipelineStatusEmailBody');

const logger = getLogger();

const sendNotification = async (message) => {
  const { authJWT, processName } = message.input;
  if (!authJWT) {
    logger.log('No authJWT token in message, skipping status check for notifications...');
    return;
  }

  const user = await authenticationMiddlewareSocketIO(authJWT, true);

  const { experimentId } = message;
  const statusRes = await getPipelineStatus(experimentId, processName);

  const experiment = await new Experiment().getExperimentData(experimentId);

  const { status } = statusRes[processName];

  // if (status === FAILED && ['production', 'test'].includes(config.clusterEnv)) {
  if (status === FAILED) {
    try {
      const { stateMachineArn } = experiment.pipelines[processName];

      await sendFailedSlackMessage(message, user, processName, stateMachineArn);
    } catch (e) {
      logger.error('Error sending slack message ', e);
    }
  }

  if (experiment.notifyByEmail
    && ((processName === QC_PROCESS_NAME && status === SUCCEEDED)
      || status === FAILED)) {
    try {
      const emailParams = buildPipelineStatusEmailBody(message.experimentId, status, user);
      await sendEmail(emailParams);
    } catch (e) {
      logger.error('Error sending email ', e);
    }
  }
};

module.exports = sendNotification;
