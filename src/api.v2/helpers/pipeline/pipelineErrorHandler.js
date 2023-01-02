const _ = require('lodash');

const getPipelineStatus = require('./getPipelineStatus');
const sendNotification = require('./hooks/sendNotification');

const updateExperimentErrorState = async (io, message) => {
  const { experimentId, input: { processName } } = message;

  const statusRes = await getPipelineStatus(experimentId, processName);
  const messageForClient = _.cloneDeep(message);

  // Make sure authJWT doesn't get back to the client
  delete messageForClient.authJWT;
  delete messageForClient.input.authJWT;

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusRes,
    type: processName,
  };

  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const handlePipelineError = async (io, parsedMessage) => {
  await updateExperimentErrorState(io, parsedMessage);
  await sendNotification(parsedMessage);
};

module.exports = handlePipelineError;
