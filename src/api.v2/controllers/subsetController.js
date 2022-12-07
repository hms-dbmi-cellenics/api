const sqlClient = require('../../sql/sqlClient');
const getLogger = require('../../utils/getLogger');

const { createSubsetPipeline } = require('../helpers/pipeline/pipelineConstruct');
const Experiment = require('../model/Experiment');
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
  });

  // Samples are not created here, we add them in handleResponse of SubsetSeurat

  logger.log(`Created ${toExperimentId}, subsetting experiment ${fromExperimentId} to it`);

  await createSubsetPipeline(fromExperimentId, toExperimentId, cellSetKeys);

  logger.log(`Started subset for experiment ${experimentId} successfully, `);

  res.json(toExperimentId);
};

const handleResponse = async () => { };

module.exports = {
  runSubset,
  handleResponse,
};
