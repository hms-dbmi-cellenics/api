const AWSXRay = require('aws-xray-sdk');
const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');

const constants = require('../general-services/pipeline-manage/constants');

const ExperimentService = require('./experiment');
const PlotsTablesService = require('./plots-tables');
const PipelineHook = require('../../utils/hookRunner');

const plotsTableService = new PlotsTablesService();
const experimentService = new ExperimentService();

const getPipelineStatus = require('../general-services/pipeline-status');
const embeddingWorkRequest = require('../../utils/hooks/embeddingWorkRequest');
const clusteringWorkRequest = require('../../utils/hooks/clusteringWorkRequest');

const pipelineHook = new PipelineHook();
pipelineHook.register('configureEmbedding', embeddingWorkRequest);
pipelineHook.register('configureEmbedding', clusteringWorkRequest);

const pipelineResponse = async (io, message) => {
  await validateRequest(message, 'PipelineResponse.v1.yaml');

  AWSXRay.getSegment().addMetadata('message', message);

  const { experimentId } = message;

  const statusRes = await getPipelineStatus(experimentId, constants.QC_PROCESS_NAME);
  const statusResToSend = { pipeline: statusRes[constants.QC_PROCESS_NAME] };

  const { error = null } = message.response;

  // Fail hard if there was an error.
  if (error) {
    logger.log('Error in qc received');
    AWSXRay.getSegment().addError(error);

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
    processingConfig: currentConfig,
  } = await experimentService.getProcessingConfig(experimentId);

  if (sampleUuid !== '') {
    console.log('== DEBUG CURRENT CONFIG ==');
    console.log(currentConfig[taskName][sampleUuid]);

    const { auto } = currentConfig[taskName][sampleUuid];

    // This is a temporary fix to save defaultFilterSettings calculated in the QC pipeline
    // to patch for old experiments with hardcoded defaultFilterSettings.
    // Remove this once we're done migrating to the new experiment schema with defaultFilterSettings
    output.config.defaultFilterSettings = auto ? output.config.filterSettings : null;

    console.log('== DEBUG OUTPUT ==');
    console.log(JSON.stringify(output.config));

    await experimentService.updateProcessingConfig(experimentId, [
      {
        name: taskName,
        body: {
          ...currentConfig[taskName],
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

  await pipelineHook.run(taskName, {
    experimentId,
    output,
    statusRes: statusResToSend,
  });

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
