
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

const constructPipelineStep = require('./constructors/construct-pipeline-step');

const experimentService = new ExperimentService();

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

const executeStateMachine = async (stateMachineArn) => {
  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });
  const { trace_id: traceId } = AWSXRay.getSegment() || {};


  const { executionArn } = await stepFunctions.startExecution({
    stateMachineArn,
    input: JSON.stringify({
      samples: ['single-branch-in-map-state'],
    }),
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
        ItemsPath: '$.samples',
        Iterator: {
          StartAt: 'CellSizeDistributionFilter',
          States: {
            CellSizeDistributionFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                taskName: 'cellSizeDistribution',
              },
              Next: 'MitochondrialContentFilter',
            },
            MitochondrialContentFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                taskName: 'mitochondrialContent',
              },
              Next: 'ClassifierFilter',
            },
            ClassifierFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                taskName: 'classifier',
              },
              Next: 'NumGenesVsNumUmisFilter',
            },
            NumGenesVsNumUmisFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
                taskName: 'numGenesVsNumUmis',
              },
              Next: 'DoubletScoresFilter',
            },
            DoubletScoresFilter: {
              XStepType: 'create-new-step',
              XConstructorArgs: {
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
          taskName: 'dataIntegration',
        },
        Next: 'ConfigureEmbedding',
      },
      ConfigureEmbedding: {
        XStepType: 'create-new-step',
        XConstructorArgs: {
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
  const accountId = await config.awsAccountIdPromise();
  const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;

  logger.log(`Fetching processing settings for ${experimentId}`);
  const processingRes = await experimentService.getProcessingConfig(experimentId);
  const { processingConfig } = processingRes;

  if (processingConfigUpdates) {
    processingConfigUpdates.forEach(({ name, body }) => {
      if (!processingConfig[name]) {
        processingConfig[name] = body;

        return;
      }

      _.merge(processingConfig[name], body);
    });
  }

  const context = {
    experimentId,
    accountId,
    roleArn,
    pipelineArtifacts: await getPipelineArtifacts(),
    clusterInfo: await getClusterInfo(),
    processingConfig,
  };

  const stateMachine = buildStateMachineDefinition(context);

  logger.log('Skeleton constructed, now creating state machine from skeleton...');
  const stateMachineArn = await createNewStateMachine(context, stateMachine);

  logger.log(`State machine with ARN ${stateMachineArn} created, launching it...`);
  const executionArn = await executeStateMachine(stateMachineArn);
  logger.log(`Execution with ARN ${executionArn} created.`);

  return { stateMachineArn, executionArn };
};


module.exports = createPipeline;
module.exports.buildStateMachineDefinition = buildStateMachineDefinition;
