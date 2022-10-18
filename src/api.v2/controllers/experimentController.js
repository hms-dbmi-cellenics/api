const _ = require('lodash');

const Experiment = require('../model/Experiment');
const UserAccess = require('../model/UserAccess');

const getLogger = require('../../utils/getLogger');
const { OK, NotFoundError } = require('../../utils/responses');
const sqlClient = require('../../sql/sqlClient');

const getExperimentBackendStatus = require('../helpers/backendStatus/getExperimentBackendStatus');
const Sample = require('../model/Sample');

const logger = getLogger('[ExperimentController] - ');

const getAllExperiments = async (req, res) => {
  const { user: { sub: userId } } = req;
  logger.log(`Getting all experiments for user: ${userId}`);

  const data = await new Experiment().getAllExperiments(userId);

  logger.log(`Finished getting all experiments for user: ${userId}, length: ${data.length}`);
  res.json(data);
};

const getExampleExperiments = async (req, res) => {
  logger.log('Getting example experiments');

  const data = await new Experiment().getExampleExperiments();

  logger.log(`Finished getting example experiments, length: ${data.length}`);
  res.json(data);
};

const getExperiment = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log(`Getting experiment ${experimentId}`);

  const data = await new Experiment().getExperimentData(experimentId);

  logger.log(`Finished getting experiment ${experimentId}`);
  res.json(data);
};

const createExperiment = async (req, res) => {
  const { params: { experimentId }, user, body } = req;
  const { name, description } = body;
  logger.log('Creating experiment');

  await sqlClient.get().transaction(async (trx) => {
    await new Experiment(trx).create({ id: experimentId, name, description });
    await new UserAccess(trx).createNewExperimentPermissions(user.sub, experimentId);
  });

  logger.log(`Finished creating experiment ${experimentId}`);
  res.json(OK());
};

const patchExperiment = async (req, res) => {
  const { params: { experimentId }, body } = req;
  logger.log(`Patching experiment ${experimentId}`);

  const snakeCasedKeysToPatch = _.mapKeys(body, (_value, key) => _.snakeCase(key));

  await new Experiment().updateById(experimentId, snakeCasedKeysToPatch);

  logger.log(`Finished patching experiment ${experimentId}`);
  res.json(OK());
};

const deleteExperiment = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log(`Deleting experiment ${experimentId}`);

  const result = await new Experiment().deleteById(experimentId);

  if (result.length === 0) {
    throw new NotFoundError(`Experiment ${experimentId} not found`);
  }

  logger.log(`Finished deleting experiment ${experimentId}`);
  res.json(OK());
};

const updateSamplePosition = async (req, res) => {
  const {
    params: { experimentId },
    body: { newPosition, oldPosition },
  } = req;
  logger.log(`Reordering sample in ${experimentId} from position ${oldPosition} to ${newPosition}`);

  if (oldPosition === newPosition) {
    logger.log('Skipping reordering, oldPosition === newPosition');
    res.json(OK());

    return;
  }

  await new Experiment().updateSamplePosition(experimentId, oldPosition, newPosition);

  logger.log(`Finished reordering samples in ${experimentId}`);
  res.json(OK());
};

const updateSamplesOptions = async (req, res) => {
  const { params: { experimentId }, body: { options } } = req;

  logger.log(`Updating options for samples in experiment ${experimentId}`);

  await new Sample().updateOption(options).where({ experiment_id: experimentId });

  logger.log(`Finished updating options for samples in experiment ${experimentId}`);
  res.json(OK());
};

const getProcessingConfig = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log('Getting processing config for experiment ', experimentId);

  const result = await new Experiment().getProcessingConfig(experimentId);

  logger.log('Finished getting processing config for experiment ', experimentId);
  res.json(result);
};

const updateProcessingConfig = async (req, res) => {
  const { params: { experimentId }, body } = req;
  logger.log('Updating processing config for experiment ', experimentId);

  await new Experiment().updateProcessingConfig(experimentId, body);

  logger.log('Finished updating processing config for experiment ', experimentId);
  res.json(OK());
};

const getBackendStatus = async (req, res) => {
  const { experimentId } = req.params;
  logger.log(`Getting backend status for experiment ${experimentId}`);

  const response = await getExperimentBackendStatus(experimentId);

  logger.log(`Finished getting backend status for experiment ${experimentId} successfully`);
  res.json(response);
};

const downloadData = async (req, res) => {
  const { experimentId, type: downloadType } = req.params;

  logger.log(`Providing download link for download ${downloadType} for experiment ${experimentId}`);

  const downloadLink = await new Experiment().getDownloadLink(experimentId, downloadType);

  logger.log(`Finished providing download link for download ${downloadType} for experiment ${experimentId}`);
  res.json(downloadLink);
};


const cloneExperiment = async (req, res) => {
  const getAllSampleIds = async (experimentId) => {
    const { samplesOrder } = await new Experiment().findById(experimentId).first();
    return samplesOrder;
  };

  const {
    params: { experimentId: fromExperimentId },
    body: {
      samplesToCloneIds = await getAllSampleIds(fromExperimentId),
      name = null,
    },
    user: { sub: userId },
  } = req;

  logger.log(`Creating experiment to clone ${fromExperimentId} to`);

  let toExperimentId;

  await sqlClient.get().transaction(async (trx) => {
    toExperimentId = await new Experiment(trx).createCopy(fromExperimentId, name);
    await new UserAccess(trx).createNewExperimentPermissions(userId, toExperimentId);
  });

  logger.log(`Cloning experiment ${fromExperimentId} into ${toExperimentId}`);

  const clonedSamplesOrder = await new Sample()
    .copyTo(fromExperimentId, toExperimentId, samplesToCloneIds);

  await new Experiment().updateById(
    toExperimentId,
    { samples_order: JSON.stringify(clonedSamplesOrder) },
  );

  logger.log(`Finished cloning experiment ${fromExperimentId}, new experiment's id is ${toExperimentId}`);

  res.json(toExperimentId);
};

module.exports = {
  getAllExperiments,
  getExampleExperiments,
  getExperiment,
  createExperiment,
  updateProcessingConfig,
  patchExperiment,
  deleteExperiment,
  updateSamplePosition,
  updateSamplesOptions,
  getProcessingConfig,
  getBackendStatus,
  downloadData,
  cloneExperiment,
};
