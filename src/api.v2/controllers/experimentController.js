const _ = require('lodash');

const Experiment = require('../model/Experiment');
const UserAccess = require('../model/UserAccess');

const getLogger = require('../../utils/getLogger');
const { OK, NotFoundError, UnauthorizedError } = require('../../utils/responses');
const sqlClient = require('../../sql/sqlClient');

const getExperimentBackendStatus = require('../helpers/backendStatus/getExperimentBackendStatus');
const Sample = require('../model/Sample');
const invalidatePlotsForEvent = require('../../utils/plotConfigInvalidation/invalidatePlotsForEvent');
const events = require('../../utils/plotConfigInvalidation/events');
const getAdminSub = require('../../utils/getAdminSub');
const config = require('../../config');
const ExperimentExecution = require('../model/ExperimentExecution');
const Plot = require('../model/Plot');
const { createCopyPipeline } = require('../helpers/pipeline/pipelineConstruct');
const { OLD_QC_NAME_TO_BE_REMOVED, NOT_CREATED } = require('../constants');
const { RUNNING } = require('../constants');
const { GEM2S_PROCESS_NAME } = require('../constants');
const LockedError = require('../../utils/responses/LockedError');
const ExperimentParent = require('../model/ExperimentParent');

const logger = getLogger('[ExperimentController] - ');

const translateProcessingConfig = (processingConfig, sampleIdsMap) => (
  _.transform(processingConfig, (acc, value, key) => {
    // If the key is a sample id, then replace it with the new id
    const newKey = sampleIdsMap[key] || key;

    // Keep going and translate the rest of the object
    acc[newKey] = _.isObject(value)
      ? translateProcessingConfig(value, sampleIdsMap)
      : value;
  })
);

const getDefaultCPUMem = (env) => {
  switch (env) {
    case 'staging':
      return { podCPUs: 1, podMemory: 14000 };
    // Stop using Batch by default in 'production':
    //   return { podCPUs: 2, podMemory: 28000 };
    default:
      return { podCPUs: null, podMemory: null };
  }
};

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

  const { podCPUs, podMemory } = getDefaultCPUMem(config.clusterEnv);

  await sqlClient.get().transaction(async (trx) => {
    await new Experiment(trx).create({
      id: experimentId, name, description, pod_cpus: podCPUs, pod_memory: podMemory,
    });
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

  const samplesOrder = await new Experiment()
    .updateSamplePosition(experimentId, oldPosition, newPosition);

  logger.log(`Finished reordering samples in ${experimentId}`);
  res.json(samplesOrder);
};

const getProcessingConfig = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log('Getting processing config for experiment ', experimentId);

  const result = await new Experiment().getProcessingConfig(experimentId);
  logger.log('Finished getting processing config for experiment ', experimentId);
  res.json(result);
};

const updateProcessingConfig = async (req, res) => {
  const { params: { experimentId }, body: changes } = req;
  logger.log('Updating processing config for experiment ', experimentId);

  await new Experiment().updateProcessingConfig(experimentId, changes);
  if (changes.find((change) => change.name === 'configureEmbedding')) {
    const { sockets } = req.app.get('io');
    await invalidatePlotsForEvent(experimentId, events.EMBEDDING_MODIFIED, sockets);
  }

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
  const userId = req.user.sub;
  const {
    params: { experimentId: fromExperimentId },
    body: { toUserId = userId, name },
  } = req;

  const adminSub = await getAdminSub();

  if (toUserId !== userId && userId !== adminSub) {
    throw new UnauthorizedError(`User ${userId} cannot clone experiments for other users.`);
  }

  const {
    [OLD_QC_NAME_TO_BE_REMOVED]: { status: qcStatus },
    [GEM2S_PROCESS_NAME]: { status: gem2sStatus },
  } = await getExperimentBackendStatus(fromExperimentId);

  if (qcStatus === RUNNING || gem2sStatus === RUNNING) {
    throw new LockedError('Experiment is currently running a pipeline and can\'t be copied');
  }

  logger.log(`Creating experiment to clone ${fromExperimentId} to`);

  let toExperimentId;
  let sampleIdsMap;
  let hasS3FilesToCopy;

  await sqlClient.get().transaction(async (trx) => {
    toExperimentId = await new Experiment(trx).createCopy(fromExperimentId, name);
    await new UserAccess(trx).createNewExperimentPermissions(toUserId, toExperimentId);


    const { samplesOrder: samplesToCloneIds, processingConfig } = await new Experiment()
      .findById(fromExperimentId)
      .first();

    const cloneSamplesOrder = await new Sample(trx)
      .copyTo(fromExperimentId, toExperimentId, samplesToCloneIds);

    // Group together the original and copy sample ids for cleaner handling
    sampleIdsMap = _.zipObject(samplesToCloneIds, cloneSamplesOrder);

    const translatedProcessingConfig = translateProcessingConfig(processingConfig, sampleIdsMap);

    await new Experiment(trx).updateById(
      toExperimentId,
      {
        samples_order: JSON.stringify(cloneSamplesOrder),
        processing_config: JSON.stringify(translatedProcessingConfig),
      },
    );

    // If the experiment didn't run yet, there's nothing else to update
    if (gem2sStatus === NOT_CREATED) {
      logger.log(`Finished cloning ${fromExperimentId}, no pipeline to run because experiment never ran`);

      hasS3FilesToCopy = false;
      return;
    }

    await new ExperimentExecution(trx).copyTo(fromExperimentId, toExperimentId, sampleIdsMap);
    await new Plot(trx).copyTo(fromExperimentId, toExperimentId, sampleIdsMap);
    await new ExperimentParent(trx).copyTo(fromExperimentId, toExperimentId);

    hasS3FilesToCopy = true;
  });

  if (hasS3FilesToCopy) {
    const {
      stateMachineArn,
      executionArn,
    } = await createCopyPipeline(fromExperimentId, toExperimentId, sampleIdsMap);

    await new ExperimentExecution().upsert(
      { experiment_id: toExperimentId, pipeline_type: 'gem2s' },
      { state_machine_arn: stateMachineArn, execution_arn: executionArn },
    );

    logger.log(`Began pipeline for cloning experiment ${fromExperimentId}, new experiment's id is ${toExperimentId}`);
  }

  res.json(toExperimentId);
};

module.exports = {
  getAllExperiments,
  getExampleExperiments,
  createExperiment,
  getExperiment,
  patchExperiment,
  deleteExperiment,
  getProcessingConfig,
  updateProcessingConfig,
  updateSamplePosition,
  getBackendStatus,
  downloadData,
  cloneExperiment,
};
