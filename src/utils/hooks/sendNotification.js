const getLogger = require('../getLogger');
const { authenticationMiddlewareSocketIO } = require('../authMiddlewares');
const getPipelineStatus = require('../../api/services/pipelines/pipelineStatus');
const { SUCCEEDED, FAILED, QC_PROCESS_NAME } = require('../../api/services/pipelines/manage/pipelineConstants');
const sendEmail = require('../email/templates/sendEmail');
const sendFailedSlackMessage = require('../sendFailedSlackMessage');
const ExperimentService = require('../../api/services/experiments/ExperimentService');
const config = require('../../config');
const buildPipelineStatusEmailBody = require('../email/templates/buildPipelineStatusEmailBody');

const logger = getLogger();

const sendNotification = async (message) => {
  const { authJWT, processName: process } = message.input;
  if (!authJWT) {
    logger.log('No authJWT token in message, skipping status check for notifications...');
    return;
  }
  const user = await authenticationMiddlewareSocketIO(authJWT);

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
