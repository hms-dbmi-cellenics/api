const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');

const validateRequest = require('../../../utils/schema-validator');
const AWS = require('../../../utils/requireAWS');
const getLogger = require('../../../utils/getLogger');


const HookRunner = require('./hooks/HookRunner');
const assignPodToPipeline = require('./hooks/assignPodToPipeline');
const { cleanupPods } = require('./hooks/podCleanup');
const updatePipelineVersion = require('./hooks/updatePipelineVersion');
const sendNotification = require('./hooks/sendNotification');

const constants = require('../../constants');
const getPipelineStatus = require('./getPipelineStatus');

const Experiment = require('../../model/Experiment');
const Plot = require('../../model/Plot');
const submitEmbeddingWork = require('../worker/workSubmit/submitEmbeddingWork');
const submitMarkerHeatmapWork = require('../worker/workSubmit/submitMarkerHeatmapWork');

const logger = getLogger();

const hookRunner = new HookRunner();

hookRunner.register(constants.ASSIGN_POD_TO_PIPELINE, [assignPodToPipeline]);
hookRunner.registerAll([sendNotification]);
hookRunner.register('configureEmbedding', [cleanupPods, updatePipelineVersion, submitEmbeddingWork, submitMarkerHeatmapWork]);

const getOutputFromS3 = async (message) => {
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

const updatePlotDataKeys = async (taskName, experimentId, output) => {
  if (output && output.plotDataKeys) {
    const plotConfigUploads = Object.entries(output.plotDataKeys)
      .map(async ([plotUuid, s3DataKey]) => (
        await new Plot().upsert(
          { id: plotUuid, experiment_id: experimentId },
          { s3_data_key: s3DataKey },
        )
      ));

    logger.log(`Uploading plot data s3 keys for ${taskName} to sql`);

    // Promise.all stops if it encounters errors.
    // This handles errors so that error in one upload does not stop others
    await Promise.all(
      plotConfigUploads.map((p) => p.catch((e) => logger.error(e))),
    );
  }
};

const updateProcessingConfigWithQCStep = async (taskName, experimentId, output, sampleUuid) => {
  // TODO the processing config validation was not being enforced because the 'anyOf' requirement
  // was not being correctly applied. This needs to be refactored together with the
  // pipeline and ideally while unifying the qc & gem2s responses.
  await validateRequest(output, 'ProcessingConfigBodies.v2.yaml');

  const experiment = new Experiment();

  const {
    processingConfig: previousConfig,
  } = await experiment.findById(experimentId).first();

  if (sampleUuid !== '') {
    const { auto } = output.config;

    const config = _.cloneDeep(output.config);

    // - If auto = true, temporary fix to save defaultFilterSettings calculated in the QC
    //  pipeline to patch for old experiments with hardcoded defaultFilterSettings.
    // Remove this once we're done migrating to the new experiment schema with defaultFilterSettings
    // - If auto = false, reuse the previous defaultFilterSettings

    // eslint-disable-next-line no-param-reassign
    config.defaultFilterSettings = auto
      ? config.filterSettings
      : previousConfig[taskName][sampleUuid].defaultFilterSettings;

    await experiment.updateProcessingConfig(experimentId, [
      {
        name: taskName,
        body: {
          ...previousConfig[taskName],
          [sampleUuid]: { ...config },
        },
      },
    ]);

    // Return the updated config, it now has defaultFilterSettings added
    return config;
  }

  await experiment.updateProcessingConfig(experimentId, [
    {
      name: taskName,
      body: output.config,
    },
  ]);

  // Non-sample specific config updates don't require modifications
  return output.config;
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

  await validateRequest(message, 'PipelineResponse.v2.yaml');

  await hookRunner.run(message);

  const { experimentId, input: { sampleUuid, taskName } } = message;
  const { error = false } = message.response || {};


  let qcStepOutput = null;

  if ('output' in message) {
    qcStepOutput = await getOutputFromS3(message);

    qcStepOutput.config = await updateProcessingConfigWithQCStep(
      taskName, experimentId, qcStepOutput, sampleUuid,
    );

    if (!error) {
      await updatePlotDataKeys(taskName, experimentId, qcStepOutput);
    }
  }

  // we want to send the update to the subscribed both in successful and error case
  await sendUpdateToSubscribed(experimentId, message, qcStepOutput, error, io);
};

module.exports = handleQCResponse;
