const { authenticationMiddlewareSocketIO } = require('../authMiddlewares');
const getPipelineStatus = require('../../api/general-services/pipeline-status');
const { SUCCEEDED, FAILED, QC_PROCESS_NAME } = require('../../api/general-services/pipeline-manage/constants');
const sendEmail = require('../send-email');
const sendFailedSlackMessage = require('../send-failed-slack-message');
const ExperimentService = require('../../api/route-services/experiment');
const config = require('../../config');

const sendNotification = async (message) => {
  const { authJWT, processName: process } = message.input;
  console.log('process is ', process, 'message  is ', message);
  if (authJWT) {
    const user = await authenticationMiddlewareSocketIO(authJWT);

    const { experimentId } = message;
    const statusRes = await getPipelineStatus(experimentId, process);
    const experiment = await (new ExperimentService()).getExperimentData(experimentId);
    console.log('EXPERIMENT IS ', experiment, 'status res is ', statusRes.getPipelineStatus);
    const { status } = statusRes[process];

    console.log(user.email, [SUCCEEDED, FAILED].includes(status), 'env is - ', config.clusterEnv);
    if ([SUCCEEDED, FAILED].includes(status)) {
      if (status === FAILED && ['production', 'staging', 'development', 'test'].includes(config.clusterEnv)) { // && ['production'].includes(config.clusterEnv)) {
        try {
          await sendFailedSlackMessage(message, user, experiment);
        } catch (e) {
          console.error('Error sending slack message ', e);
        }
      }
      if (experiment.notifyByEmail && (process === QC_PROCESS_NAME || status === FAILED)) {
        try {
          await sendEmail(message.experimentId, status, user);
        } catch (e) {
          console.error('Error sending email ', e);
        }
      }
    }
  }
};

module.exports = sendNotification;
