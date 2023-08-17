const sqlClient = require('../../sql/sqlClient');
const getLogger = require('../../utils/getLogger');
const { GEM2S_PROCESS_NAME } = require('../constants');
const { OK } = require('../../utils/responses');
const { createSubsetPipeline } = require('../helpers/pipeline/pipelineConstruct');
const Experiment = require('../model/Experiment');
const ExperimentExecution = require('../model/ExperimentExecution');
const ExperimentParent = require('../model/ExperimentParent');
const UserAccess = require('../model/UserAccess');

const logger = getLogger('[SubsetController] - ');

const runSubset = async (stateMachineParams, authorization) => {
  const {
    experimentId: parentExperimentId,
    name,
    userId,
  } = stateMachineParams;

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
    stateMachineParams,
    subsetExperimentId,
    parentProcessingConfig,
    authorization,
  );

  const newExecution = {
    state_machine_arn: stateMachineArn,
    execution_arn: executionArn,
  };

  await new ExperimentExecution().updateExecution(
    subsetExperimentId,
    GEM2S_PROCESS_NAME,
    newExecution,
    stateMachineParams,
  );

  logger.log(`Started subset for experiment ${parentExperimentId} successfully, subset experimentId: ${subsetExperimentId}`);
  return subsetExperimentId;
};

const handleSubsetRequest = async (req, res) => {
  const {
    params: { experimentId },
    body: { name, cellSetKeys },
    user: { sub: userId },
  } = req;

  const stateMachineParams = {
    experimentId,
    name,
    cellSetKeys,
    userId,
  };

  const subsetExperimentId = await runSubset(stateMachineParams, req.headers.authorization);
  res.json(subsetExperimentId);
};

module.exports = {
  handleSubsetRequest,
  runSubset,
};
