const fake = require('../../test-utils/constants');
const { buildStateMachineDefinition } = require('../../../src/api/general-services/pipeline-manage');
const {
  getFirstQCStep, getQCStepsToRun, getGem2sPipelineSkeleton, getQcPipelineSkeleton,
} = require('../../../src/api/general-services/pipeline-manage/skeletons');
const { buildQCPipelineSteps } = require('../../../src/api/general-services/pipeline-manage/skeletons/qc-pipeline-skeleton');

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: () => Buffer.from('asdfg'),
}));

const snapshotPlainJsonSerializer = {
  // eslint-disable-next-line no-unused-vars
  test(val) {
    return true;
  },
  // eslint-disable-next-line no-unused-vars
  serialize(val, prettyConfig, indentation, depth, refs, printer) {
    return `\n${JSON.stringify(val, null, 2)}`;
  },
};
expect.addSnapshotSerializer(snapshotPlainJsonSerializer);

const getContext = (processName) => ({
  experimentId: 'mock-experiment-id',
  accountId: 'mock-account-id',
  roleArn: 'mock-role-arn',
  processName,
  sandboxId: 'pipeline-assignation',
  activityArn: `arn:aws:states:eu-west-1:28592648592:activity:biomage-${processName}-production-39249897-cfce-402b-a617-e58fbf251713`,
  pipelineArtifacts: {
    'remoter-server': 'mock-remoter-server-image',
    'remoter-client': 'mock-remoter-client-image',
  },
  clusterInfo: {
    name: 'mock-cluster-name',
    endpoint: 'https://RANDOMSTRING.gr7.eu-west-1.eks.amazonaws.com',
    certAuthority: 'mock-ca',
  },
  processingConfig: {},
});


describe('helper functions for skeletons', () => {
  it('returns the correct first step given a list', () => {
    const processingConfig = [
      {
        name: 'numGenesVsNumUmis',
        body: {
          auto: true,
          filterSettings: {
            regressionType: 'linear',
            regressionTypeSettings: {
              linear: {
                'p.level': 0.001,
              },
              spline: {
                'p.level': 0.001,
              },
            },
          },
          enabled: true,
          '8e6ffc70-14c1-425f-b1be-cef9656a55a5': {
            auto: true,
            filterSettings: {
              regressionType: 'linear',
              regressionTypeSettings: {
                linear: {
                  'p.level': 0.0002898551,
                },
                spline: {
                  'p.level': 0.001,
                },
              },
            },
            defaultFilterSettings: {
              regressionType: 'linear',
              regressionTypeSettings: {
                linear: {
                  'p.level': 0.0002898551,
                },
                spline: {
                  'p.level': 0.001,
                },
              },
            },
            api_url: 'http://host.docker.internal:3000',
            enabled: true,
          },
        },
      },
      {
        name: 'cellSizeDistribution',
        body: {
          auto: true,
          filterSettings: {
            minCellSize: 1080,
            binStep: 200,
          },
          enabled: false,
          '8e6ffc70-14c1-425f-b1be-cef9656a55a5': {
            auto: true,
            filterSettings: {
              minCellSize: 1136,
              binStep: 200,
            },
            defaultFilterSettings: {
              minCellSize: 1136,
              binStep: 200,
            },
            api_url: 'http://host.docker.internal:3000',
            enabled: false,
          },
        },
      },
      {
        name: 'doubletScores',
        body: {
          auto: true,
          filterSettings: {
            probabilityThreshold: 0.5,
            binStep: 0.05,
          },
          enabled: true,
          '8e6ffc70-14c1-425f-b1be-cef9656a55a5': {
            auto: true,
            filterSettings: {
              probabilityThreshold: 0.6506245,
              binStep: 0.05,
            },
            defaultFilterSettings: {
              probabilityThreshold: 0.6506245,
              binStep: 0.05,
            },
            api_url: 'http://host.docker.internal:3000',
            enabled: true,
          },
        },
      },
    ];

    const firstStep = getFirstQCStep(processingConfig);
    expect(firstStep).toEqual('CellSizeDistributionFilterMap');
  });

  it('returns the default first step and full state machine if the config has no updates', () => {
    const processingConfig = [];

    const firstStep = getFirstQCStep(processingConfig);
    expect(firstStep).toEqual('ClassifierFilterMap');

    const qcSteps = getQCStepsToRun(firstStep);
    const stateMachine = buildQCPipelineSteps(qcSteps);
    expect(stateMachine).toMatchSnapshot();
  });
});

describe('non-tests to document the State Machines', () => {
  let context = getContext('qc');
  it('- qc local development', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('development', fake.EXPERIMENT_ID, []);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('staging', fake.EXPERIMENT_ID, []);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc production', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('production', fake.EXPERIMENT_ID, []);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  context = getContext('gem2s');
  it('- gem2s local development', () => {
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton('development');
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s staging', () => {
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton('staging');
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s production', () => {
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton('production');
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });
});
