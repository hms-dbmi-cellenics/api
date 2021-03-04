
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

const experimentService = new ExperimentService();

const getPipelineImages = async () => {
  const response = await fetch(
    config.pipelineInstanceConfigUrl,
    {
      method: 'GET',
    },
  );

  const txt = await response.text();
  const manifest = YAML.parseAllDocuments(txt);

  return jq.json(manifest, '..|objects|.images//empty');
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

const constructPipelineStep = (context, step) => {
  const { XStepType: stepType, XConstructorArgs: args } = step;

  /* eslint-disable global-require */
  switch (stepType) {
    case 'delete-completed-jobs': {
      const f = require('./constructors/delete-complete-jobs');
      return f(context, step, args);
    }
    case 'create-new-job-if-not-exist': {
      const f = require('./constructors/create-new-job-if-not-exist');
      return f(context, step, args);
    }
    case 'create-new-step': {
      const f = require('./constructors/create-new-step');
      return f(context, step, args);
    }
    default: {
      throw new Error(`Invalid state type specified: ${stepType}`);
    }
  }
  /* eslint-enable global-require */
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
    name: `biomage-pipeline-${pipelineHash}`,
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
    input: '{}',
    traceHeader: traceId,
  }).promise();

  return executionArn;
};

const createPipeline = async (experimentId) => {
  const accountId = await config.awsAccountIdPromise();
  const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;

  logger.log(`Fetching processing settings for ${experimentId}`);
  const res = await experimentService.getProcessingConfig(experimentId);
  const { processingConfig } = res;

  const context = {
    experimentId,
    accountId,
    roleArn,
    pipelineImages: await getPipelineImages(),
    clusterInfo: await getClusterInfo(),
    processingConfig,
  };

  const skeleton = {
    Comment: 'N/A',
    StartAt: 'DeleteCompletedPipelineWorker',
    States: {
      DeleteCompletedPipelineWorker: {
        XStepType: 'delete-completed-jobs',
        Next: 'LaunchNewPipelineWorker',
      },
      LaunchNewPipelineWorker: {
        XStepType: 'create-new-job-if-not-exist',
        Next: 'Filters',
      },
      Filters: {
        Type: 'Parallel',
        Next: 'DataIntegration',
        Branches: [{
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
              End: true,
            },
          },
        }],
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
        End: true,
      },
    },
  };

  logger.log('Constructing pipeline steps...');
  const stateMachine = _.cloneDeepWith(skeleton, (o) => {
    if (_.isObject(o) && o.XStepType) {
      return {
        ...constructPipelineStep(context, o),
        XStepType: undefined,
        XConstructorArgs: undefined,
      };
    }
    return undefined;
  });

  logger.log('Skeleton constructed, now creating state machine from skeleton...');
  const stateMachineArn = await createNewStateMachine(context, stateMachine);

  logger.log(`State machine with ARN ${stateMachineArn} created, launching it...`);
  const executionArn = await executeStateMachine(stateMachineArn);
  logger.log(`Execution with ARN ${executionArn} created.`);

  return { stateMachineArn, executionArn };
};


module.exports = createPipeline;
