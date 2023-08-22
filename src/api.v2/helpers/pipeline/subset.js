const sqlClient = require('../../../sql/sqlClient');
const getLogger = require('../../../utils/getLogger');
const { GEM2S_PROCESS_NAME } = require('../../constants');
const { createSubsetPipeline } = require('./pipelineConstruct');
const Experiment = require('../../model/Experiment');
const ExperimentExecution = require('../../model/ExperimentExecution');
const ExperimentParent = require('../../model/ExperimentParent');
const UserAccess = require('../../model/UserAccess');

const logger = getLogger('[SubsetController] - ');

const createExperimentToSubset = async (parentExperimentId, userId, name) => {
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

  return subsetExperimentId;
};

const executeSubsetPipeline = async (params, authorization) => {
  const {
    experimentId: parentExperimentId,
    subsetExperimentId,
  } = params;

  const {
    processingConfig: parentProcessingConfig,
  } = await new Experiment().findById(parentExperimentId).first();

  const { stateMachineArn, executionArn } = await createSubsetPipeline(
    params,
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
    params,
  );

  logger.log(`Started subset for experiment ${parentExperimentId} successfully, subset experimentId: ${subsetExperimentId}`);
};

module.exports = {
  createExperimentToSubset,
  executeSubsetPipeline,
};
