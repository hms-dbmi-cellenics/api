const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');

const ExperimentService = require('./experiment');
const PlotsTablesService = require('./plots-tables');

const experimentService = new ExperimentService();
const plotsTableService = new PlotsTablesService();

const plotsInTables = {
  cellSizeDistribution: [
    'umisInCells',
    'umisCellRank',
  ],
  mitochondrialContent: [
    'mitochondrialContent',
    'mitochondrialReads',
  ],
  classifier: [
    'classifierContour',
  ],
  numGenesVsNumUmis: [
    'genesVsUmisHistogram',
    'genesVsUmisScatterplot',
  ],
  doubletScores: [
    'doubletScoreHistogram',
  ],
  dataIntegration: [
    'dataIntegrationEmbedding',
    'dataIntegrationFrequency',
    'dataIntegrationElbow',
  ],
  configureEmbedding: [
    'embeddingPreviewBySample',
    'embeddingPreviewByCellSets',
    'embeddingPreviewMitochondrialContent',
    'embeddingPreviewDoubletScores',
  ],
};

const pipelineResponse = async (io, message) => {
  await validateRequest(message, 'PipelineResponse.v1.yaml');

  // Fail hard if there was an error.
  const { response: { error }, input: { experimentId, taskName } } = message;

  if (error) {
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

  if (output.plotData) {
    const plotConfigUploads = plotsInTables[taskName].map((plotUuid) => (
      plotsTableService.updatePlotData(
        experimentId,
        plotUuid,
        output.plotData,
      )
    ));

    Promise.all(plotConfigUploads);
  }

  experimentService.updateProcessingConfig(experimentId, [{ name: taskName, body: output.config }]);

  // Concatenate into a proper response.
  const response = {
    ...message,
    output,
  };

  logger.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

module.exports = pipelineResponse;
