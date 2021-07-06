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
const { OK } = require('../../utils/responses');
const logger = require('../../utils/logging');

const ExperimentService = require('./experiment');
const ProjectService = require('./projects');
const SamplesService = require('./samples');

const uglyTemporalFixedProcessingConfig = (processingConfig, filterName) => {
  // This is an ugly patch we need to remove once filterName's processing config is fixed
  // (right now we only receive default values which we no longer use)
  const {
    auto, enabled, filterSettings, ...samples
  } = processingConfig.cellSizeDistribution;

  const sampleIds = Object.keys(samples);
  const defaultFilterSetting = processingConfig[filterName];

  const perSampleFilterSetting = sampleIds.reduce(
    (acum, sampleId) => {
      // eslint-disable-next-line no-param-reassign
      acum[sampleId] = defaultFilterSetting;
      return acum;
    },
    {},
  );

  const fixedProcessingConfig = _.clone(processingConfig);
  fixedProcessingConfig[filterName] = {
    ...processingConfig[filterName],
    ...perSampleFilterSetting,
  };

  return fixedProcessingConfig;
};

const addMissingPerSampleProcessingConfigValues = (processingConfig) => {
  let fixedProcessingConfig = uglyTemporalFixedProcessingConfig(processingConfig, 'classifier');
  fixedProcessingConfig = uglyTemporalFixedProcessingConfig(fixedProcessingConfig, 'mitochondrialContent');

  return fixedProcessingConfig;
};


const withAutomaticSettings = (processingConfig) => {
  const processingConfigWithAuto = _.cloneDeep(processingConfig);

  // adding default config to every filter with auto option
  Object.keys(processingConfig).forEach((step) => {
    const currentStepSettings = processingConfig[step];
    const sampleId = Object.keys(currentStepSettings).find(
      (currentSample) => currentStepSettings[currentSample].auto,
    );

    if (sampleId) {
      processingConfigWithAuto[step][sampleId]
        .defaultFilterSettings = processingConfig[step][sampleId].filterSettings;
    }
  });

  return processingConfigWithAuto;
};

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

  static async generateGem2sTaskParams(experimentId) {
    const experiment = await (new ExperimentService()).getExperimentData(experimentId);
    const { samples } = await (new SamplesService()).getSamplesByExperimentId(experimentId);
    const { metadataKeys } = await (new ProjectService()).getProject(experiment.projectId);

    const defaultMetadataValue = 'N.A.';

    const samplesEntries = Object.entries(samples);

    const taskParams = {
      projectId: experiment.projectId,
      experimentName: experiment.experimentName,
      organism: experiment.meta.organism,
      input: { type: experiment.meta.type },
      sampleIds: samplesEntries.map(([sampleId]) => sampleId),
      sampleNames: samplesEntries.map(([, sample]) => sample.name),
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

    return taskParams;
  }

  static async gem2sShouldRun(experimentId, paramsHash) {
    logger.log('Checking if gem2s should actually be re run');

    const experimentService = new ExperimentService();

    const handlesPromise = experimentService.getPipelinesHandles(experimentId);
    const statusPromise = getPipelineStatus(experimentId, GEM2S_PROCESS_NAME);

    const [handles, statusWrapper] = await Promise.all([handlesPromise, statusPromise]);

    const { [GEM2S_PROCESS_NAME]: gem2sHandle } = handles;
    const { [GEM2S_PROCESS_NAME]: { status: gem2sStatus } } = statusWrapper;

    if (gem2sStatus === SUCCEEDED) {
      return paramsHash !== gem2sHandle.paramsHash;
    }

    return gem2sStatus !== RUNNING;
  }

  static async gem2sCreate(experimentId) {
    const taskParams = await this.generateGem2sTaskParams(experimentId);

    const paramsHash = crypto
      .createHash('sha1')
      .update(JSON.stringify(taskParams))
      .digest('hex');

    const shouldRun = await this.gem2sShouldRun(experimentId, paramsHash);

    if (!shouldRun) {
      logger.log('Gem2s create call ignored');
      return OK();
    }

    logger.log('Running new gem2s pipeline');

    const newHandle = await createGem2SPipeline(experimentId, taskParams, paramsHash);

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

    const messageForClient = _.cloneDeep(message);

    const {
      experimentId, taskName, item,
    } = messageForClient;

    if (item) {
      const fixedProcessingConfig = addMissingPerSampleProcessingConfigValues(
        item.processingConfig,
      );

      item.processingConfig = withAutomaticSettings(fixedProcessingConfig);
    }

    await pipelineHook.run(taskName, {
      experimentId,
      item,
    });

    await this.sendUpdateToSubscribed(experimentId, messageForClient, io);
  }
}


module.exports = Gem2sService;
