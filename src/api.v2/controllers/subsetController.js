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
    params: { experimentId: fromExperimentId },
    body: { name, cellSetKeys },
    user: { sub: userId },
  } = req;

  logger.log(`Creating experiment to subset ${fromExperimentId}`);

  let toExperimentId;
  await sqlClient.get().transaction(async (trx) => {
    toExperimentId = await new Experiment(trx).createCopy(fromExperimentId, name, false);
    await new UserAccess(trx).createNewExperimentPermissions(userId, toExperimentId);

    await new ExperimentParent(trx).create(
      { experiment_id: toExperimentId, parent_experiment_id: fromExperimentId },
    );
  });

  // Samples are not created here, we add them in handleResponse of SubsetSeurat

  logger.log(`Created ${toExperimentId}, subsetting experiment ${fromExperimentId} to it`);

  const { stateMachineArn, executionArn } = await createSubsetPipeline(
    fromExperimentId,
    toExperimentId,
    name,
    cellSetKeys,
    req.headers.authorization,
  );

  const newExecution = {
    last_gem2s_params: {},
    state_machine_arn: stateMachineArn,
    execution_arn: executionArn,
  };

  const experimentExecutionClient = new ExperimentExecution();

  await experimentExecutionClient.upsert(
    {
      experiment_id: toExperimentId,
      pipeline_type: GEM2S_PROCESS_NAME,
    },
    newExecution,
  );

  logger.log(`Started subset for experiment ${experimentId} successfully, subset experimentId: ${toExperimentId}`);

  res.json(toExperimentId);
};

module.exports = {
  runSubset,
};
