const { authenticationMiddlewareSocketIO } = require('../authMiddlewares');
const getPipelineStatus = require('../../api/general-services/pipeline-status');
const { SUCCEEDED, FAILED, QC_PROCESS_NAME } = require('../../api/general-services/pipeline-manage/constants');
const sendEmail = require('../send-email');
const sendFailedSlackMessage = require('../send-failed-slack-message');
const ExperimentService = require('../../api/route-services/experiment');
const config = require('../../config');

const sendNotification = async (message) => {
  const { authJWT, processName: process } = message.input;
  if (authJWT) {
    const user = await authenticationMiddlewareSocketIO(authJWT);

    const { experimentId } = message;
    const statusRes = await getPipelineStatus(experimentId, process);
    const experiment = await (new ExperimentService()).getExperimentData(experimentId);
    const { status } = statusRes[process];

    if ([SUCCEEDED, FAILED].includes(status)) {
      if (status === FAILED && ['production', 'staging', 'development', 'test'].includes(config.clusterEnv)) {
        try {
          await sendFailedSlackMessage(message, user, experiment);
        } catch (e) {
          console.error('Error sending slack message ', e);
        }
      }
      if (experiment.notifyByEmail && (process === QC_PROCESS_NAME || status === FAILED)) {
        try {
          sendEmail(message.experimentId, status, user);
        } catch (e) {
          console.error('Error sending email ', e);
        }
      }
    }
  }
};

module.exports = sendNotification;
