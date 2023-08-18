const { OK } = require('../../../utils/responses');

const { runGem2s } = require('../../controllers/gem2sController');
const { runSeurat } = require('../../controllers/seuratController');
const { runSubset } = require('../../controllers/subsetController');
const {
  GEM2S_PROCESS_NAME, SEURAT_PROCESS_NAME, SUBSET_PROCESS_NAME,
} = require('../../constants');
const ExperimentExecution = require('../../model/ExperimentExecution');

const getLogger = require('../../../utils/getLogger');

const logger = getLogger();

const stateMachineToPipeline = {
  [SUBSET_PROCESS_NAME]: runSubset,
  [GEM2S_PROCESS_NAME]: runGem2s,
  [SEURAT_PROCESS_NAME]: runSeurat,
};

const getPipelineType = (stateMachineArn) => {
  const processNames = [
    SUBSET_PROCESS_NAME,
    GEM2S_PROCESS_NAME,
    SEURAT_PROCESS_NAME,
  ];

  // Check which processName the string stateMachineArn includes
  return processNames.find((processName) => stateMachineArn.includes(processName));
};

const retryExperiment = async (req, res) => {
  const { experimentId } = req.params;
  logger.log(`Retrying experiment ${experimentId}`);
  const {
    retryParams,
    stateMachineArn,
  } = await new ExperimentExecution().findOne({ experiment_id: experimentId });
  logger.log(`Previously called with ${JSON.stringify(retryParams)}`);
  const pipelineType = getPipelineType(stateMachineArn);
  logger.log(`Pipeline type is: ${pipelineType}`);

  // Retry the pipeline
  await stateMachineToPipeline[pipelineType](retryParams, req.headers.authorization);

  res.json(OK());
};

module.exports = {
  retryExperiment,
};
