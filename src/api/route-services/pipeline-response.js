const AWSXRay = require('aws-xray-sdk');
const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');
const getLogger = require('../../utils/getLogger');

const constants = require('../general-services/pipeline-manage/constants');
const getPipelineStatus = require('../general-services/pipeline-status');

const ExperimentService = require('./experiment');
const PlotsTablesService = require('./plots-tables');
const sendEmailIfNecessary = require('../../utils/sendEmailIfNecessary');
const sendFailedSlackMessage = require('../../utils/sendFailedSlackMessage');
const { authenticationMiddlewareSocketIO } = require('../../utils/authMiddlewares');

const plotsTableService = new PlotsTablesService();
const experimentService = new ExperimentService();

const logger = getLogger();

const pipelineResponse = async (io, message) => {
  await validateRequest(message, 'PipelineResponse.v1.yaml');

  AWSXRay.getSegment().addMetadata('message', message);

  const { experimentId } = message;

  const statusRes = await getPipelineStatus(experimentId, constants.QC_PROCESS_NAME);
  const statusResToSend = { pipeline: statusRes[constants.QC_PROCESS_NAME] };
  const { SUCCEEDED, FAILED } = constants;
  const { error = null } = message.response;

  // Fail hard if there was an error.
  if (error) {
    logger.log('Error in qc received');
    AWSXRay.getSegment().addError(error);
    const user = await authenticationMiddlewareSocketIO(message.input.authJWT);
    if (user.email) {
      await sendFailedSlackMessage(message, user);
    }
    const errorResponse = {
      type: 'qc',
      status: statusResToSend,
      ...message,
    };

    io.sockets.emit(`ExperimentUpdates-${experimentId}`, errorResponse);
    return;
  }

  // Download output from S3.
  const s3 = new AWS.S3();
  const { input: { taskName, sampleUuid }, output: { bucket, key } } = message;

  const outputObject = await s3.getObject(
    {
      Bucket: bucket,
      Key: key,
    },
  ).promise();
  const output = JSON.parse(outputObject.Body.toString());

  if (output.config) {
    await validateRequest(output.config, 'ProcessingConfigBodies.v1.yaml');
  }

  if (output.plotDataKeys) {
    const plotConfigUploads = Object.entries(output.plotDataKeys).map(([plotUuid, objKey]) => (
      plotsTableService.updatePlotDataKey(
        experimentId,
        plotUuid,
        objKey,
      )
    ));

    logger.log('Uploading plotData for', taskName, 'to DynamoDB');

    // Promise.all stops if it encounters errors.
    // This handles errors so that error in one upload does not stop others
    // Resulting promise resolves to an array with the resolve/reject value of p
    Promise.all(plotConfigUploads.map((p) => p.catch((e) => e)));
  }

  const {
    processingConfig: previousConfig,
  } = await experimentService.getProcessingConfig(experimentId);

  if (sampleUuid !== '') {
    const { auto } = output.config;

    // This is a temporary fix to save defaultFilterSettings calculated in the QC pipeline
    // to patch for old experiments with hardcoded defaultFilterSettings.
    // Remove this once we're done migrating to the new experiment schema with defaultFilterSettings
    if (auto) output.config.defaultFilterSettings = output.config.filterSettings;

    await experimentService.updateProcessingConfig(experimentId, [
      {
        name: taskName,
        body: {
          ...previousConfig[taskName],
          [sampleUuid]: { ...output.config },
        },
      },
    ]);
  } else {
    await experimentService.updateProcessingConfig(experimentId, [
      {
        name: taskName,
        body: output.config,
      },
    ]);
  }
  const { status } = statusResToSend.pipeline || false;
  if ([FAILED, SUCCEEDED].includes(status)) {
    sendEmailIfNecessary(constants.QC_PROCESS_NAME, status, experimentId);
  }
  // Concatenate into a proper response.
  const response = {
    ...message,
    output,
    status: statusResToSend,
    type: 'qc',
  };
  logger.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};
module.exports = pipelineResponse;
