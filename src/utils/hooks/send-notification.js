const getLogger = require('../getLogger');
const { authenticationMiddlewareSocketIO } = require('../authMiddlewares');
const getPipelineStatus = require('../../api/general-services/pipeline-status');
const { SUCCEEDED, FAILED, QC_PROCESS_NAME } = require('../../api/general-services/pipeline-manage/constants');
const sendEmail = require('../send-email');
const sendFailedSlackMessage = require('../send-failed-slack-message');
const ExperimentService = require('../../api/route-services/experiment');
const config = require('../../config');
const buildPipelineStatusEmailBody = require('../emailTemplates/buildPipelineStatusEmailBody');

const logger = getLogger();
const NA = 'N/A';

const sendNotification = async (message) => {
  const { authJWT, processName: process } = message.input;
  if (!authJWT) {
    logger.log('No authJWT token in message, skipping status check for notifications...');
    return;
  }
  let user = NA;
  try {
    user = await authenticationMiddlewareSocketIO(authJWT);
  } catch (e) {
    logger.error('could not retrieve user from token: ', e);
  }

  const { experimentId } = message;
  const statusRes = await getPipelineStatus(experimentId, process);
  const experiment = await (new ExperimentService()).getExperimentData(experimentId);
  const { status } = statusRes[process];

  if (status === FAILED && ['production', 'test'].includes(config.clusterEnv)) {
    try {
      await sendFailedSlackMessage(message, user, experiment);
    } catch (e) {
      logger.error('Error sending slack message ', e);
    }
  }
  if (user !== NA && experiment.notifyByEmail
      && ((process === QC_PROCESS_NAME && status === SUCCEEDED)
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
