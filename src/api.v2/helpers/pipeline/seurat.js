const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');

const constants = require('../../constants');
const getPipelineStatus = require('./getPipelineStatus');
const { createSeuratObjectPipeline } = require('./pipelineConstruct');

const Sample = require('../../model/Sample');
const Experiment = require('../../model/Experiment');
const ExperimentExecution = require('../../model/ExperimentExecution');

const HookRunner = require('./hooks/HookRunner');

const validateRequest = require('../../../utils/schema-validator');
const getLogger = require('../../../utils/getLogger');

const logger = getLogger('[SeuratService] - ');

const hookRunner = new HookRunner();


const sendUpdateToSubscribed = async (experimentId, message, io) => {
  const statusRes = await getPipelineStatus(experimentId, constants.SEURAT_PROCESS_NAME);

  // Concatenate into a proper response.
  const response = {
    ...message,
    status: statusRes,
    type: constants.SEURAT_PROCESS_NAME,
  };

  const { error = null } = message.response || {};
  if (error) {
    logger.log(`Error in ${constants.SEURAT_PROCESS_NAME} received`);
    AWSXRay.getSegment().addError(error);
  }

  logger.log('Sending to all clients subscribed to experiment', experimentId);

  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

const generateSeuratParams = async (experimentId, authJWT) => {
  const defaultMetadataValue = 'N.A.';

  logger.log('Generating seurat params');

  const getS3Paths = (files) => (
    {
      seurat: files.seurat.s3Path,
    }
  );

  const [experiment, samples] = await Promise.all([
    new Experiment().findById(experimentId).first(),
    new Sample().getSamples(experimentId),
  ]);

  const samplesInOrder = experiment.samplesOrder.map(
    (sampleId) => _.find(samples, { id: sampleId }),
  );

  const s3Paths = {};
  experiment.samplesOrder.forEach((sampleId) => {
    const { files } = _.find(samples, { id: sampleId });

    s3Paths[sampleId] = getS3Paths(files);
  });

  const taskParams = {
    projectId: experimentId,
    experimentName: experiment.name,
    organism: null,
    input: { type: samples[0].sampleTechnology },
    sampleIds: experiment.samplesOrder,
    sampleNames: _.map(samplesInOrder, 'name'),
    sampleS3Paths: s3Paths,
    authJWT,
  };

  const metadataKeys = Object.keys(samples[0].metadata);

  if (metadataKeys.length) {
    logger.log('Adding metadatakeys to task params');

    taskParams.metadata = metadataKeys.reduce((acc, key) => {
      // Make sure the key does not contain '-' as it will cause failure in SEURAT
      const sanitizedKey = key.replace(/-+/g, '_');

      acc[sanitizedKey] = Object.values(samplesInOrder).map(
        (sampleValue) => sampleValue.metadata[key] || defaultMetadataValue,
      );

      return acc;
    }, {});
  }

  logger.log('Task params generated');

  return taskParams;
};

const createSeuratPipeline = async (experimentId, body, authJWT) => {
  logger.log('Creating SEURAT params...');
  const { paramsHash } = body;

  const taskParams = await generateSeuratParams(experimentId, authJWT);

  const { stateMachineArn, executionArn } = await
  createSeuratObjectPipeline(experimentId, taskParams);

  logger.log('SEURAT params created.');

  const newExecution = {
    params_hash: paramsHash,
    state_machine_arn: stateMachineArn,
    execution_arn: executionArn,
  };

  await new ExperimentExecution().upsert(
    {
      experiment_id: experimentId,
      pipeline_type: 'seurat',
    },
    newExecution,
  );

  logger.log('SEURAT params saved.');

  return newExecution;
};

const handleSeuratResponse = async (io, message) => {
  AWSXRay.getSegment().addMetadata('message', message);

  // Fail hard if there was an error.
  await validateRequest(message, 'SEURATResponse.v2.yaml');

  await hookRunner.run(message);

  const { experimentId } = message;

  const messageForClient = _.cloneDeep(message);

  // Make sure authJWT doesn't get back to the client
  delete messageForClient.authJWT;
  delete messageForClient.input.authJWT;

  await sendUpdateToSubscribed(experimentId, messageForClient, io);
};

module.exports = {
  createSeuratPipeline,
  handleSeuratResponse,
};
