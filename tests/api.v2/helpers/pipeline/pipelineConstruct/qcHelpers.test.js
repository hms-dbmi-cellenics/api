
const { getQcStepsToRun } = require('../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/qcHelpers');
const { buildQCPipelineSteps } = require('../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/skeletons/qcPipelineSkeleton');
const fake = require('../../../../test-utils/constants');

jest.mock('../../../../../src/api.v2/helpers/s3/fileExists', () => ({
  fileExists: jest.fn(() => true),
}));

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

describe('helper functions for skeletons', () => {
  it('returns the first changed step if it is before all the completed steps', async () => {
    const completedSteps = ['ClassifierFilter'];

    const qcSteps = await getQcStepsToRun(fake.EXPERIMENT_ID, processingConfig, completedSteps);
    expect(qcSteps[0]).toEqual('CellSizeDistributionFilterMap');
  });

  it('returns from first not-completed step if the config has changes after that', async () => {
    const completedSteps = [];

    const qcSteps = await getQcStepsToRun(fake.EXPERIMENT_ID, processingConfig, completedSteps);
    expect(qcSteps[0]).toEqual('ClassifierFilterMap');
    const stateMachine = buildQCPipelineSteps(qcSteps);
    expect(stateMachine).toMatchSnapshot();
  });

  it('returns from first not-completed step if the config has no changes', async () => {
    const completedSteps = [
      'ClassifierFilter',
      'CellSizeDistributionFilter',
      'MitochondrialContentFilter',
      'NumGenesVsNumUmisFilter',
    ];

    const qcSteps = await getQcStepsToRun(fake.EXPERIMENT_ID, [], completedSteps);
    expect(qcSteps[0]).toEqual('DoubletScoresFilterMap');
    const stateMachine = buildQCPipelineSteps(qcSteps);
    expect(stateMachine).toMatchSnapshot();
  });
});
