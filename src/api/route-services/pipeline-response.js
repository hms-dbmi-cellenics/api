const AWSXRay = require('aws-xray-sdk');
const { v4: uuidv4 } = require('uuid');
const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');

const ExperimentService = require('./experiment');
const PlotsTablesService = require('./plots-tables');
const WorkSubmitService = require('../general-services/work-submit');

const pipelineStatus = require('../general-services/pipeline-status');

const plotsTableService = new PlotsTablesService();
const experimentService = new ExperimentService();

const pipelineResponse = async (io, message) => {
  await validateRequest(message, 'PipelineResponse.v1.yaml');

  AWSXRay.getSegment().addMetadata('message', message);

  // Fail hard if there was an error.
  const { response: { error }, input: { experimentId, taskName, sampleUuid } } = message;

  if (error) {
    AWSXRay.getSegment().addError(error);
    io.sockets.emit(`ExperimentUpdates-${experimentId}`, message);
    return;
  }

  // Download output from S3.
  const s3 = new AWS.S3();
  const { output: { bucket, key } } = message;

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
    await experimentService.updateProcessingConfig(experimentId, [
      {
        name: taskName,
        body: { ...currentConfig[taskName], [sampleUuid]: output.config },
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

  const statusRes = await pipelineStatus(experimentId);

  if (taskName === 'configureEmbedding') {
    const now = new Date();
    const addTimeoutSeconds = 60;
    const timeout = new Date(now.getTime() + addTimeoutSeconds * 1000);

    // Run work request for embedding
    const embeddingWorkRequest = {
      experimentId,
      timeout,
      uuid: uuidv4(),
      body: {
        name: 'GetEmbedding',
        type: output.config.embeddingSettings.method,
        config: output.config.embeddingSettings.methodSettings[
          output.config.embeddingSettings.method
        ],
      },
      PipelineRunETag: statusRes.pipeline.startDate,
    };

    const embeddingWork = new WorkSubmitService(embeddingWorkRequest);
    await embeddingWork.submitWork();

    // Run work request for cell clustering
    const clusteringWorkRequest = {
      experimentId,
      timeout,
      uuid: uuidv4(),
      body: {
        name: 'ClusterCells',
        cellSetName: 'Louvain clusters',
        type: output.config.clusteringSettings.method,
        cellSetKey: 'louvain',
        config: {
          resolution: output.config.clusteringSettings.methodSettings[
            output.config.clusteringSettings.method
          ],
        },
      },
      PipelineRunETag: statusRes.pipeline.startDate,
    };

    const clusteringWork = new WorkSubmitService(clusteringWorkRequest);
    await clusteringWork.submitWork();
  }

  // Concatenate into a proper response.
  const response = {
    ...message,
    output,
    status: statusRes,
  };

  logger.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

module.exports = pipelineResponse;
