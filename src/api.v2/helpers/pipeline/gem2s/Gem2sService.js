const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');

// const constants = require('../general-services/pipeline-manage/constants');
const constants = require('../constants');
// const getPipelineStatus = require('../general-services/pipeline-status');
const getPipelineStatus = require('../getPipelineStatus');
// const { createGem2SPipeline } = require('../general-services/pipeline-manage');
const { createGem2SPipeline } = require('../pipelineConstruct');

const sendNotification = require('../hooks/sendNotification');
const validateRequest = require('../../../../utils/schema-validator');
const PipelineHook = require('../../../../utils/hooks/hookRunner');
const getLogger = require('../../../../utils/getLogger');

const Sample = require('../../../model/Sample');
const Experiment = require('../../../model/Experiment');
const ExperimentExecution = require('../../../model/ExperimentExecution');

const logger = getLogger();

const pipelineHook = new PipelineHook();

const saveProcessingConfigFromGem2s = ({ experimentId, item }) => {
  new Experiment().updateById(experimentId, { processing_config: item });
};

const continueToQC = () => {
  // const continueToQC = (payload) => {
  // const { experimentId } = payload;
  // we need to change this once we rework the pipeline message response
  // const authJWT = payload.authJWT || payload.input.authJWT;
  // await createQCPipeline(experimentId, [], authJWT);
};

pipelineHook.register('uploadToAWS', [
  saveProcessingConfigFromGem2s,
  continueToQC,
]);

pipelineHook.registerAll([sendNotification]);

class Gem2sService {
  static async sendUpdateToSubscribed(experimentId, message, io) {
    const statusRes = await getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME);
    // Concatenate into a proper response.
    const response = {
      ...message,
      status: statusRes,
      type: constants.GEM2S_PROCESS_NAME,
    };

    const { error = null } = message.response || {};
    if (error) {
      logger.log(`Error in ${constants.GEM2S_PROCESS_NAME} received`);
      AWSXRay.getSegment().addError(error);
    }
    logger.log('Sending to all clients subscribed to experiment', experimentId);
    io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
  }

  static async generateGem2sParams(experimentId, authJWT) {
    // const experiment = await (new ExperimentService()).getExperimentData(experimentId);
    // const samples = await (new SamplesService()).getSamplesByExperimentId(experimentId);

    // const {
    //   metadataKeys,
    // } = await new ProjectsService().getProject(experiment.projectId);

    const defaultMetadataValue = 'N.A.';

    logger.log('Generating task params');

    const getS3Paths = (files) => (
      {
        matrix10x: files.matrix10x.s3Path,
        barcodes10x: files.barcodes10x.s3Path,
        features10x: files.features10x.s3Path,
      }
    );

    const [experimentRes, samples] = await Promise.all([
      new Experiment().findById(experimentId),
      new Sample().getSamples(experimentId),
    ]);

    const experiment = experimentRes[0];
    const samplesInOrder = experiment.samplesOrder.map(
      (sampleId) => _.find(samples, { id: sampleId }),
    );

    const s3Paths = _.map(samplesInOrder, 'files').map(getS3Paths);

    const taskParams = {
      projectId: experimentId,
      experimentName: experiment.name,
      organism: null,
      input: { type: samples[0].sampleTechnology },
      sampleIds: experiment.samplesOrder,
      sampleNames: _.map(samplesInOrder, 'name'),
      sampleS3Paths: s3Paths,
      apiVersion: 'v2',
      authJWT,
    };

    const metadataKeys = Object.keys(samples[0].metadata);

    if (metadataKeys.length) {
      logger.log('Adding metadatakeys to task params');

      taskParams.metadata = metadataKeys.reduce((acc, key) => {
        // Make sure the key does not contain '-' as it will cause failure in GEM2S
        const sanitizedKey = key.replace(/-+/g, '_');

        acc[sanitizedKey] = Object.values(samplesInOrder).map(
          (sampleValue) => sampleValue.metadata[key] || defaultMetadataValue,
        );

        return acc;
      }, {});
    }

    logger.log('Task params generated');

    return taskParams;
  }

  static async gem2sCreate(experimentId, body, authJWT) {
    logger.log('Creating GEM2S params...');
    const { paramsHash } = body;

    const taskParams = await Gem2sService.generateGem2sParams(experimentId, authJWT);

    const { stateMachineArn, executionArn } = await createGem2SPipeline(experimentId, taskParams);

    logger.log('GEM2S params created.');

    const newExecution = {
      params_hash: paramsHash,
      state_machine_arn: stateMachineArn,
      execution_arn: executionArn,
    };

    await new ExperimentExecution().upsert(
      {
        experiment_id: experimentId,
        pipeline_type: 'gem2s',
      },
      newExecution,
    );

    await new ExperimentExecution().update(
      { experiment_id: experimentId, pipeline_type: 'gem2s' },
      newExecution,
    );

    logger.log('GEM2S params saved.');

    return newExecution;
  }

  static async gem2sResponse(io, message) {
    AWSXRay.getSegment().addMetadata('message', message);

    // Fail hard if there was an error.
    await validateRequest(message, 'GEM2SResponse.v1.yaml');

    await pipelineHook.run(message);

    const { experimentId } = message;

    const messageForClient = _.cloneDeep(message);

    // Make sure authJWT doesn't get back to the client
    delete messageForClient.authJWT;
    delete messageForClient.input.authJWT;

    await Gem2sService.sendUpdateToSubscribed(experimentId, messageForClient, io);
  }
}


module.exports = Gem2sService;
