const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');

const crypto = require('crypto');
const constants = require('../general-services/pipeline-manage/constants');
const getPipelineStatus = require('../general-services/pipeline-status');
const { createGem2SPipeline } = require('../general-services/pipeline-manage');

const { GEM2S_PROCESS_NAME, RUNNING, SUCCEEDED } = require('../general-services/pipeline-manage/constants');

const saveProcessingConfigFromGem2s = require('../../utils/hooks/saveProcessingConfigFromGem2s');
const runQCPipeline = require('../../utils/hooks/runQCPipeline');
const validateRequest = require('../../utils/schema-validator');
const PipelineHook = require('../../utils/hookRunner');
const getLogger = require('../../utils/getLogger');

const ExperimentService = require('./experiment');
const ProjectsService = require('./projects');
const SamplesService = require('./samples');

const logger = getLogger();

const pipelineHook = new PipelineHook();

pipelineHook.register('uploadToAWS', [saveProcessingConfigFromGem2s, runQCPipeline]);

class Gem2sService {
  static async sendUpdateToSubscribed(experimentId, message, io) {
    const statusRes = await getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME);

    // Concatenate into a proper response.
    const response = {
      ...message,
      status: statusRes,
      type: 'gem2s',
    };

    const { error = null } = message.response || {};

    if (error) {
      logger.log('Error in gem2s received');

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
      taskParams.metadata = metadataKeys.reduce((acc, key) => {
        // Make sure the key does not contain '-' as it will cause failure in GEM2S
        const sanitizedKey = key.replace(/-+/g, '_');

        acc[sanitizedKey] = samplesEntries.map(
          ([, sample]) => sample.metadata[key] || defaultMetadataValue,
        );
        return acc;
      }, {});
    }

    // Different sample order should not change the hash.
    const orderInvariantSampleIds = [...experiment.sampleIds].sort();

    const hashParams = {
      organism: experiment.meta.organism,
      input: { type: experiment.meta.type },
      sampleIds: orderInvariantSampleIds,
      sampleNames: orderInvariantSampleIds.map((sampleId) => samples[sampleId].name),
      metadata: taskParams.metadata,
    };

    return { taskParams, hashParams };
  }

  static async gem2sShouldRun(experimentId, paramsHash, status) {
    logger.log('Checking if gem2s should actually be re run');
    const experimentService = new ExperimentService();
    const handles = await experimentService.getPipelinesHandles(experimentId);
    const { [GEM2S_PROCESS_NAME]: gem2sHandle } = handles;
    logger.log(`Gem2s status is ${status}. new hash: ${paramsHash}; old hash: ${gem2sHandle.paramsHash}`);
    if (status === SUCCEEDED) {
      return paramsHash !== gem2sHandle.paramsHash;
    }

    return status !== RUNNING;
  }


  static async gem2sCreate(experimentId, authJWT) {
    const { taskParams, hashParams } = await this.generateGem2sParams(experimentId, authJWT);
    const paramsHash = crypto
      .createHash('sha1')
      .update(JSON.stringify(hashParams))
      .digest('hex');

    logger.log('Running new gem2s pipeline');

    const newHandle = await createGem2SPipeline(experimentId, taskParams);

    const experimentService = new ExperimentService();
    await experimentService.saveGem2sHandle(
      experimentId,
      { paramsHash, ...newHandle },
    );

    return newHandle;
  }

  static async gem2sResponse(io, message) {
    AWSXRay.getSegment().addMetadata('message', message);

    // Fail hard if there was an error.
    await validateRequest(message, 'GEM2SResponse.v1.yaml');

    const {
      experimentId, taskName, item, authJWT,
    } = message;

    await pipelineHook.run(taskName, {
      experimentId,
      item,
      authJWT,
    });


    const messageForClient = _.cloneDeep(message);

    // Make sure authJWT doesn't get back to the client
    delete messageForClient.authJWT;

    await this.sendUpdateToSubscribed(experimentId, messageForClient, io);
  }
}


module.exports = Gem2sService;
