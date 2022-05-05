const getLogger = require('../getLogger');
const { authenticationMiddlewareSocketIO } = require('../authMiddlewares');
const getPipelineStatus = require('../../api/general-services/pipeline-status');
const { SUCCEEDED, FAILED, QC_PROCESS_NAME } = require('../../api/general-services/pipeline-manage/constants');
const sendEmail = require('../send-email');
const sendFailedSlackMessage = require('../send-failed-slack-message');
const ExperimentService = require('../../api/route-services/experiment');
const config = require('../../config');
const buildPipelineStatusEmailBody = require('../emailTemplates/buildPipelineStatusEmailBody');
const { OLD_QC_NAME_TO_BE_REMOVED } = require('../constants');

const logger = getLogger();

const sendNotification = async (message) => {
  const { authJWT, processName: process } = message.input;
  if (!authJWT) {
    logger.log('No authJWT token in message, skipping status check for notifications...');
    return;
  }

  const user = await authenticationMiddlewareSocketIO(authJWT, true);

  const { experimentId } = message;
  const statusRes = await getPipelineStatus(experimentId, process);
  const experiment = await (new ExperimentService()).getExperimentData(experimentId);
  const { status } = statusRes[process];

  if (status === FAILED && ['production', 'test'].includes(config.clusterEnv)) {
    try {
      const stateMachineArn = process === 'qc' ? experiment.meta[OLD_QC_NAME_TO_BE_REMOVED].stateMachineArn : experiment.meta[process].stateMachineArn;

      await sendFailedSlackMessage(message, user, process, stateMachineArn);
    } catch (e) {
      logger.error('Error sending slack message ', e);
    }
  }
  if (experiment.notifyByEmail
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
