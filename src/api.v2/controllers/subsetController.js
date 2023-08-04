const sqlClient = require('../../sql/sqlClient');
const getLogger = require('../../utils/getLogger');
const { GEM2S_PROCESS_NAME } = require('../constants');

const { createSubsetPipeline } = require('../helpers/pipeline/pipelineConstruct');
const Experiment = require('../model/Experiment');
const ExperimentExecution = require('../model/ExperimentExecution');
const ExperimentParent = require('../model/ExperimentParent');
const UserAccess = require('../model/UserAccess');

const logger = getLogger('[SubsetController] - ');

const runSubset = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Starting subset for experiment ${experimentId}`);

  const {
    params: { experimentId: parentExperimentId },
    body: { name, cellSetKeys },
    user: { sub: userId },
  } = req;

  logger.log(`Creating experiment to subset ${parentExperimentId}`);

  let subsetExperimentId;
  await sqlClient.get().transaction(async (trx) => {
    subsetExperimentId = await new Experiment(trx).createCopy(parentExperimentId, name);
    await new UserAccess(trx).createNewExperimentPermissions(userId, subsetExperimentId);

    await new ExperimentParent(trx).create(
      { experiment_id: subsetExperimentId, parent_experiment_id: parentExperimentId },
    );
  });

  // Samples are not created here, we add them in handleResponse of SubsetSeurat

  logger.log(`Created ${subsetExperimentId}, subsetting experiment ${parentExperimentId} to it`);

  const {
    processingConfig: parentProcessingConfig,
  } = await new Experiment().findById(parentExperimentId).first();

  const { stateMachineArn, executionArn } = await createSubsetPipeline(
    parentExperimentId,
    subsetExperimentId,
    name,
    cellSetKeys,
    parentProcessingConfig,
    req.headers.authorization,
  );

  const newExecution = {
    state_machine_arn: stateMachineArn,
    execution_arn: executionArn,
  };



  const experimentExecutionClient = new ExperimentExecution();

  await experimentExecutionClient.upsert(
    {
      experiment_id: subsetExperimentId,
      pipeline_type: GEM2S_PROCESS_NAME,
    },
    newExecution,
  );

  logger.log(`Started subset for experiment ${experimentId} successfully, subset experimentId: ${subsetExperimentId}`);

  res.json(subsetExperimentId);
};

module.exports = {
  runSubset,
};
