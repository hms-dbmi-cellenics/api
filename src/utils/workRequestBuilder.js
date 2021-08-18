const { v4: uuidv4 } = require('uuid');
const WorkSubmitService = require('../api/general-services/work-submit');

const validateRequest = require('./schema-validator');

const workRequestBuilder = async (workerTaskName, config) => {
  const workerTasks = [
    'GetEmbedding',
    'ListGenes',
    'DifferentialExpression',
    'GeneExpression',
    'ClusterCells',
    'GetDoubletScore',
    'GetMitochondrialContent',
    'MarkerHeatmap',
  ];

  if (!workerTaskName || !workerTasks.includes(workerTaskName)) {
    throw new Error('Invalid worker task: Task is not defined');
  }

  // Add timeout
  const now = new Date();
  const oneMinuteInSeconds = 60 * 1000;
  const timeout = new Date(now.getTime() + 60 * oneMinuteInSeconds);

  const workConfig = {
    experimentId: null,
    socketId: 'broadcast',
    timeout,
    uuid: uuidv4(),
    body: {},
    PipelineRunETag: null,
    ...config,
  };

  await validateRequest(workConfig, 'WorkRequest.v1.yaml');
  const worker = new WorkSubmitService(workConfig);
  return worker;
};

module.exports = workRequestBuilder;
