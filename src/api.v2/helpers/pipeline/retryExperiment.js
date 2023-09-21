const { OK } = require('../../../utils/responses');

const { runGem2s } = require('./gem2s');
const { runSeurat } = require('./seurat');
const { startSubsetPipeline } = require('./subset');
const {
  GEM2S_PROCESS_NAME, SEURAT_PROCESS_NAME, SUBSET_PROCESS_NAME,
} = require('../../constants');
const ExperimentExecution = require('../../model/ExperimentExecution');

const getLogger = require('../../../utils/getLogger');

const logger = getLogger();

const stateMachineToPipeline = {
  [SUBSET_PROCESS_NAME]: startSubsetPipeline,
  [GEM2S_PROCESS_NAME]: runGem2s,
  [SEURAT_PROCESS_NAME]: runSeurat,
};

const getPipelineType = (stateMachineArn) => Object.keys(stateMachineToPipeline)
  .find(
    (processName) => stateMachineArn.includes(processName),
  );

const retryExperiment = async (req, res) => {
  const { experimentId } = req.params;
  logger.log(`Retrying experiment ${experimentId}`);
  const {
    retryParams,
    stateMachineArn,
  } = await new ExperimentExecution().findOne({ experiment_id: experimentId });

  const pipelineType = getPipelineType(stateMachineArn);

  logger.log(`Previously called with ${JSON.stringify(retryParams)}`);
  logger.log(`Pipeline type is: ${pipelineType}`);

  // Retry the pipeline
  await stateMachineToPipeline[pipelineType](retryParams, req.headers.authorization);

  res.json(OK());
};

module.exports = {
  retryExperiment,
};
