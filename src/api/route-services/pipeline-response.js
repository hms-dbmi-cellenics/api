const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');
const logger = require('../../utils/logging');

const PlotsTablesService = require('./plots-tables');

const plotsTableService = new PlotsTablesService();

const plots = {
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

  // testing
  logger.log('Uploading plot data for task', taskName);
  output.plotData = [
    {
      x: 1,
      y: 2,
      values: 3,
    },
    {
      x: 2,
      y: 3,
      values: 4,
    },
    {
      x: 3,
      y: 4,
      values: 5,
    },
  ];


  if (output.plotData) {
    const plotConfigUploads = plots[taskName].map((plotUuid) => (
      plotsTableService.updatePlotData(
        experimentId,
        plotUuid,
        output.plotData,
      )
    ));

    Promise.all(plotConfigUploads);
  }

  // Concatenate into a proper response.
  const response = {
    ...message,
    output,
  };

  logger.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

module.exports = pipelineResponse;
