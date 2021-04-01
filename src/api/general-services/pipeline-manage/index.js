
const crypto = require('crypto');
const jq = require('jq-web');
const YAML = require('yaml');
const _ = require('lodash');
const AWSXRay = require('aws-xray-sdk');
const fetch = require('node-fetch');
const AWS = require('../../../utils/requireAWS');
const config = require('../../../config');
const logger = require('../../../utils/logging');
const ExperimentService = require('../../route-services/experiment');
const SamplesService = require('../../route-services/samples');

const constructPipelineStep = require('./constructors/construct-pipeline-step');

const experimentService = new ExperimentService();
const samplesService = new SamplesService();

const getPipelineArtifacts = async () => {
  const response = await fetch(
    config.pipelineInstanceConfigUrl,
    {
      method: 'GET',
    },
  );

  const txt = await response.text();
  const manifest = YAML.parseAllDocuments(txt);

  return {
    chartRef: jq.json(manifest, '..|objects| select(.metadata != null) | select( .metadata.name | contains("pipeline")) | .spec.chart.ref//empty'),
    'remoter-server': jq.json(manifest, '..|objects|.["remoter-server"].image//empty'),
    'remoter-client': jq.json(manifest, '..|objects|.["remoter-client"].image//empty'),
  };
};

const getClusterInfo = async () => {
  if (config.clusterEnv === 'development') return {};

  const eks = new AWS.EKS({
    region: config.awsRegion,
  });

  const { cluster: info } = await eks.describeCluster({ name: `biomage-${config.clusterEnv}` }).promise();
  const { name, endpoint, certificateAuthority: { data: certAuthority } } = info;

  return {
    name,
    endpoint,
    certAuthority,
  };
};

const createNewStateMachine = async (context, stateMachine) => {
  const { clusterEnv, sandboxId } = config;
  const { experimentId, roleArn, accountId } = context;

  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });

  const pipelineHash = crypto
    .createHash('sha1')
    .update(`${experimentId}-${sandboxId}`)
    .digest('hex');

  const params = {
    name: `biomage-pipeline-${clusterEnv}-${pipelineHash}`,
    roleArn,
    definition: JSON.stringify(stateMachine),
    loggingConfiguration: { level: 'OFF' },
    tags: [
      { key: 'experimentId', value: experimentId },
      { key: 'clusterEnv', value: clusterEnv },
      { key: 'sandboxId', value: sandboxId },
    ],
    type: 'STANDARD',
  };

  let stateMachineArn = null;

  try {
    const response = await stepFunctions.createStateMachine(params).promise();
    stateMachineArn = response.stateMachineArn;
  } catch (e) {
    if (e.code !== 'StateMachineAlreadyExists') {
      throw e;
    }

    logger.log('State machine already exists, updating...');

    stateMachineArn = `arn:aws:states:${config.awsRegion}:${accountId}:stateMachine:${params.name}`;

    await stepFunctions.updateStateMachine(
      { stateMachineArn, definition: params.definition, roleArn },
    ).promise();
  }

  return stateMachineArn;
};

const executeStateMachine = async (stateMachineArn, execInput) => {
  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });
  const { trace_id: traceId } = AWSXRay.getSegment() || {};


  const { executionArn } = await stepFunctions.startExecution({
    stateMachineArn,
    input: JSON.stringify(execInput),
    traceHeader: traceId,
  }).promise();

  return executionArn;
};

const buildStateMachineDefinition = (context) => {
  const skeleton = {
    Comment: `Pipeline for clusterEnv '${config.clusterEnv}'`,
    StartAt: 'DeleteCompletedPipelineWorker',
    States: {
      DeleteCompletedPipelineWorker: {
        XStepType: 'delete-completed-jobs',
        Next: 'LaunchNewPipelineWorker',
        ResultPath: null,
      },
      LaunchNewPipelineWorker: {
        XStepType: 'create-new-job-if-not-exist',
        Next: 'Filters',
        ResultPath: null,
      },
      Filters: {
        Type: 'Map',
        Next: 'DataIntegration',
        MaxConcurrency: 1,
        ItemsPath: '$.samples',
        Iterator: {
          StartAt: 'ClassifierFilter',
          States: {
            ClassifierFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                perSample: true,
                taskName: 'classifier',
              },
              Next: 'CellSizeDistributionFilter',
            },
            CellSizeDistributionFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                perSample: true,
                taskName: 'cellSizeDistribution',
              },
              Next: 'MitochondrialContentFilter',
            },
            MitochondrialContentFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                perSample: true,
                taskName: 'mitochondrialContent',
              },
              Next: 'NumGenesVsNumUmisFilter',
            },
            NumGenesVsNumUmisFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                perSample: true,
                taskName: 'numGenesVsNumUmis',
              },
              Next: 'DoubletScoresFilter',
            },
            DoubletScoresFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                perSample: true,
                taskName: 'doubletScores',
              },
              XNextOnCatch: 'EndOfMap',
              End: true,
            },
            EndOfMap: {
              Type: 'Pass',
              End: true,
            },
          },
        },
      },
      DataIntegration: {
        XStepType: 'create-new-step',
        XConstructorArgs: {
          perSample: false,
          taskName: 'dataIntegration',
        },
        Next: 'ConfigureEmbedding',
      },
      ConfigureEmbedding: {
        XStepType: 'create-new-step',
        XConstructorArgs: {
          perSample: false,
          taskName: 'configureEmbedding',
        },
        XNextOnCatch: 'EndOfPipeline',
        End: true,
      },
      EndOfPipeline: {
        Type: 'Pass',
        End: true,
      },
    },
  };

  logger.log('Constructing pipeline steps...');
  const stateMachine = _.cloneDeepWith(skeleton, (o) => {
    if (_.isObject(o) && o.XStepType) {
      return _.omit(constructPipelineStep(context, o), ['XStepType', 'XConstructorArgs', 'XNextOnCatch']);
    }
    return undefined;
  });

  return stateMachine;
};

const createPipeline = async (experimentId, processingConfigUpdates) => {
  const accountId = await config.awsAccountIdPromise;
  const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;

  logger.log(`Fetching processing settings for ${experimentId}`);
  const { processingConfig } = await experimentService.getProcessingConfig(experimentId);

  const samplesRes = await samplesService.getSampleIds(experimentId);
  const { samples } = samplesRes;

  if (processingConfigUpdates) {
    processingConfigUpdates.forEach(({ name, body }) => {
      if (!processingConfig[name]) {
        processingConfig[name] = body;

        return;
      }

      _.merge(processingConfig[name], body);
    });
  }

  // This is the processing configuration merged for multiple samples where
  // appropriate.
  // eslint-disable-next-line consistent-return
  const mergedProcessingConfig = _.cloneDeepWith(processingConfig, (o) => {
    if (_.isObject(o) && !o.dataIntegration && o.enabled) {
      // Find which samples have sample-specific configurations.
      const sampleConfigs = _.intersection(Object.keys(o), samples.ids);

      // Get an object that is only the "raw" configuration.
      const rawConfig = _.omit(o, sampleConfigs);

      const result = {};

      samples.ids.forEach((sample) => {
        result[sample] = _.merge(rawConfig, o[sample]);
      });

      return result;
    }
  });

  const context = {
    experimentId,
    accountId,
    roleArn,
    pipelineArtifacts: await getPipelineArtifacts(),
    clusterInfo: await getClusterInfo(),
    processingConfig: mergedProcessingConfig,
  };

  const stateMachine = buildStateMachineDefinition(context);

  logger.log('Skeleton constructed, now creating state machine from skeleton...');
  const stateMachineArn = await createNewStateMachine(context, stateMachine);

  logger.log(`State machine with ARN ${stateMachineArn} created, launching it...`);

  const execInput = {
    samples: samples.ids.map((sampleUuid, index) => ({ sampleUuid, index })),
  };

  const executionArn = await executeStateMachine(stateMachineArn, execInput);
  logger.log(`Execution with ARN ${executionArn} created.`);

  return { stateMachineArn, executionArn };
};


module.exports = createPipeline;
module.exports.buildStateMachineDefinition = buildStateMachineDefinition;
