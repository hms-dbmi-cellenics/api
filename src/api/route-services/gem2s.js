const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');

const constants = require('../general-services/pipeline-manage/constants');
const getPipelineStatus = require('../general-services/pipeline-status');
const { createGem2SPipeline } = require('../general-services/pipeline-manage');
const { authenticationMiddlewareSocketIO } = require('../../utils/authMiddlewares');
const {
  GEM2S_PROCESS_NAME,
} = require('../general-services/pipeline-manage/constants');

const saveProcessingConfigFromGem2s = require('../../utils/hooks/save-gem2s-processing-config');
const runQCPipeline = require('../../utils/hooks/run-qc-pipeline');
const validateRequest = require('../../utils/schema-validator');
const PipelineHook = require('../../utils/hookRunner');
const getLogger = require('../../utils/getLogger');

const ExperimentService = require('./experiment');
const ProjectsService = require('./projects');
const SamplesService = require('./samples');
const sendEmailIfNecessary = require('../../utils/sendEmailIfNecessary');
const sendFailedSlackMessage = require('../../utils/sendFailedSlackMessage');

const logger = getLogger();

const pipelineHook = new PipelineHook();

pipelineHook.register('uploadToAWS', [saveProcessingConfigFromGem2s, runQCPipeline]);

class Gem2sService {
  static async sendUpdateToSubscribed(experimentId, message, io) {
    const statusRes = await getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME);
    const { status } = statusRes.gem2s;
    // Concatenate into a proper response.
    const response = {
      ...message,
      status: statusRes,
      type: constants.GEM2S_PROCESS_NAME,
    };

    const { error = null } = message.response || {};

    if (error) {
      logger.log(`Error in ${constants.GEM2S_PROCESS_NAME} received`);
      const user = await authenticationMiddlewareSocketIO(message.input.authJWT);
      if (user.email) {
        await sendEmailIfNecessary(GEM2S_PROCESS_NAME, status, experimentId, user);
        await sendFailedSlackMessage(message, user);
      }
      AWSXRay.getSegment().addError(error);
    }
    logger.log('Sending to all clients subscribed to experiment', experimentId);
    io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
  }

  static async generateGem2sParams(experimentId, authJWT) {
    const experiment = await (new ExperimentService()).getExperimentData(experimentId);
    const { samples } = await (new SamplesService()).getSamplesByExperimentId(experimentId);
    const {
      metadataKeys,
    } = await new ProjectsService().getProject(experiment.projectId);

    const defaultMetadataValue = 'N.A.';

    const samplesEntries = Object.entries(samples);

    logger.log('Generating task params');

    const taskParams = {
      projectId: experiment.projectId,
      experimentName: experiment.experimentName,
      organism: experiment.meta.organism,
      input: { type: experiment.meta.type },
      sampleIds: experiment.sampleIds,
      sampleNames: experiment.sampleIds.map((sampleId) => samples[sampleId].name),
      authJWT,
    };

    if (metadataKeys.length) {
      logger.log('Adding metadatakeys to task params');

      taskParams.metadata = metadataKeys.reduce((acc, key) => {
        // Make sure the key does not contain '-' as it will cause failure in GEM2S
        const sanitizedKey = key.replace(/-+/g, '_');

        acc[sanitizedKey] = samplesEntries.map(
          ([, sample]) => sample.metadata[key] || defaultMetadataValue,
        );
        return acc;
      }, {});
    }

    logger.log('Task params generated');

    return taskParams;
  }


  static async gem2sCreate(experimentId, body, authJWT) {
    const { paramsHash } = body;
    const taskParams = await Gem2sService.generateGem2sParams(experimentId, authJWT);

    const newHandle = await createGem2SPipeline(experimentId, taskParams);

    logger.log('GEM2S params created.');

    const experimentService = new ExperimentService();

    await experimentService.saveGem2sHandle(
      experimentId,
      { paramsHash, ...newHandle },
    );

    logger.log('GEM2S params saved.');

    return newHandle;
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

    await Gem2sService.sendUpdateToSubscribed(experimentId, messageForClient, io);
  }
}


module.exports = Gem2sService;
