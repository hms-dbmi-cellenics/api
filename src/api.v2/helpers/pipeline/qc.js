const AWSXRay = require('aws-xray-sdk');
const validateRequest = require('../../../utils/schema-validator');
const AWS = require('../../../utils/requireAWS');
const getLogger = require('../../../utils/getLogger');

const { assignPodToPipeline } = require('../../../utils/hooks/pipeline-assign');

const HookRunner = require('./hooks/HookRunner');
const { cleanupPods } = require('../../../utils/hooks/pod-cleanup');

const constants = require('./constants');
const getPipelineStatus = require('./getPipelineStatus');

// const ExperimentService = require('./experiment');
// const PipelineHook = require('../../utils/hooks/hookRunner');

const Experiment = require('../../model/Experiment');

const sendNotification = require('./hooks/sendNotification');

const logger = getLogger();

const hookRunner = new HookRunner();

hookRunner.register(constants.ASSIGN_POD_TO_PIPELINE, [assignPodToPipeline]);
hookRunner.registerAll([sendNotification]);
hookRunner.register('configureEmbedding', [cleanupPods]);

const getS3Output = async (message) => {
  const { output: { bucket, key } } = message;
  const s3 = new AWS.S3();
  const outputObject = await s3.getObject(
    {
      Bucket: bucket,
      Key: key,
    },
  ).promise();

  return JSON.parse(outputObject.Body.toString());
};

// const updatePlotData = async (taskName, experimentId, output) => {
//   if (output.plotDataKeys) {
//     const plotConfigUploads = Object.entries(output.plotDataKeys).map(([plotUuid, objKey]) => (
//       plotsTableService.updatePlotDataKey(
//         experimentId,
//         plotUuid,
//         objKey,
//       )
//     ));

//     logger.log('Uploading plotData for', taskName, 'to DynamoDB');

//     // Promise.all stops if it encounters errors.
//     // This handles errors so that error in one upload does not stop others
//     // Resulting promise resolves to an array with the resolve/reject value of p
//     Promise.all(plotConfigUploads.map((p) => p.catch((e) => e)));
//   }
// };

const updateProcessingConfig = async (taskName, experimentId, output, sampleUuid) => {
  // TODO the processing config validation was not being enforced because the 'anyOf' requirement
  // was not being correctly applied. This needs to be refactored together with the
  // pipeline and ideally while unifying the qc & gem2s responses.
  // await validateRequest(output, 'ProcessingConfigBodies.v1.yaml');

  const experiment = new Experiment();

  const {
    processingConfig: previousConfig,
  } = await experiment.findById(experimentId).first();

  if (sampleUuid !== '') {
    const { auto } = output.config;

    // This is a temporary fix to save defaultFilterSettings calculated in the QC pipeline
    // to patch for old experiments with hardcoded defaultFilterSettings.
    // Remove this once we're done migrating to the new experiment schema with
    // defaultFilterSettings
    const sampleOutput = output;

    if (auto) sampleOutput.config.defaultFilterSettings = output.config.filterSettings;

    await experiment.updateProcessingConfig(experimentId, [
      {
        name: taskName,
        body: {
          ...previousConfig[taskName],
          [sampleUuid]: { ...sampleOutput.config },
        },
      },
    ]);
  } else {
    await experiment.updateProcessingConfig(experimentId, [
      {
        name: taskName,
        body: output.config,
      },
    ]);
  }
};

const sendUpdateToSubscribed = async (experimentId, message, output, error, io) => {
  const statusRes = await getPipelineStatus(experimentId, constants.QC_PROCESS_NAME);
  const statusResToSend = { pipeline: statusRes[constants.QC_PROCESS_NAME] };

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusResToSend,
    type: constants.QC_PROCESS_NAME,
  };

  if (output !== null) {
    response.output = output;
  }
  if (error) {
    logger.log(`Error in ${constants.QC_PROCESS_NAME} received`);
    AWSXRay.getSegment().addError(error);
  }
  logger.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const handleQCResponse = async (io, message) => {
  AWSXRay.getSegment().addMetadata('message', message);

  await validateRequest(message, 'PipelineResponse.v1.yaml');

  await hookRunner.run(message);

  const { experimentId } = message;
  const { error = false } = message.response || {};

  let output = null;
  // if there aren't errors proceed with the updates
  if (!error && 'output' in message) {
    const { input: { sampleUuid, taskName } } = message;

    output = await getS3Output(message);

    // await updatePlotData(taskName, experimentId, output);
    await updateProcessingConfig(taskName, experimentId, output, sampleUuid);
  }
  // we want to send the update to the subscribed both in successful and error case
  await sendUpdateToSubscribed(experimentId, message, output, error, io);
};

module.exports = {
  handleQCResponse,
};
