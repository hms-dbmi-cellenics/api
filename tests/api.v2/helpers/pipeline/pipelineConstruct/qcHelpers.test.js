
const { getQcStepsToRun } = require('../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/qcHelpers');
const { buildQCPipelineSteps } = require('../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/skeletons/qcPipelineSkeleton');
const fake = require('../../../../test-utils/constants');

const CellLevelMeta = require('../../../../../src/api.v2/model/CellLevelMeta');
const ExperimentExecution = require('../../../../../src/api.v2/model/ExperimentExecution');

jest.mock('../../../../../src/api.v2/helpers/s3/fileExists', () => ({
  fileExists: jest.fn(() => true),
}));

jest.mock('../../../../../src/api.v2/model/CellLevelMeta');
jest.mock('../../../../../src/api.v2/model/ExperimentExecution');

const cellLevelMetaInstance = new CellLevelMeta();
const experimentExecutionInstance = new ExperimentExecution();

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

const mockCellLevelMetadataCheck = (currentCellLevelMetadataId, previousRunCellLevelMetadataId) => {
  cellLevelMetaInstance.getMetadataByExperimentIds.mockReturnValueOnce(
    Promise.resolve([{ id: currentCellLevelMetadataId }]),
  );

  experimentExecutionInstance.find.mockReturnValueOnce({
    first: () => Promise.resolve(
      { lastPipelineParams: { cellMetadataId: previousRunCellLevelMetadataId } },
    ),
  });
};

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

  it('returns from first not-completed step if the config has changes and cell level metadata changed', async () => {
    mockCellLevelMetadataCheck('sameCellLevelId', 'otherCellLevelId');
    const completedSteps = [];

    const qcSteps = await getQcStepsToRun(fake.EXPERIMENT_ID, processingConfig, completedSteps);
    expect(qcSteps[0]).toEqual('ClassifierFilterMap');
    const stateMachine = buildQCPipelineSteps(qcSteps);
    expect(stateMachine).toMatchSnapshot();
  });

  it('Works if the config has no changes but the previous run failed', async () => {
    const completedSteps = [
      'ClassifierFilter',
      'CellSizeDistributionFilter',
      'MitochondrialContentFilter',
      'NumGenesVsNumUmisFilter',
    ];

    const qcSteps = await getQcStepsToRun(fake.EXPERIMENT_ID, [], completedSteps, 'FAILED');
    expect(qcSteps[0]).toEqual('DoubletScoresFilterMap');
    const stateMachine = buildQCPipelineSteps(qcSteps);
    expect(stateMachine).toMatchSnapshot();
  });

  it('Works if the config has no changes but the previous run never started', async () => {
    const completedSteps = [];

    const qcSteps = await getQcStepsToRun(fake.EXPERIMENT_ID, [], completedSteps, 'FAILED');
    expect(qcSteps[0]).toEqual('ClassifierFilterMap');
    const stateMachine = buildQCPipelineSteps(qcSteps);
    expect(stateMachine).toMatchSnapshot();
  });

  it('Works if the only thing that changed is the cellLevelMetadata', async () => {
    mockCellLevelMetadataCheck('sameCellLevelId', 'otherCellLevelId');

    const completedSteps = [
      'ClassifierFilterMap',
      'CellSizeDistributionFilterMap',
      'MitochondrialContentFilterMap',
      'NumGenesVsNumUmisFilterMap',
      'DoubletScoresFilterMap',
      'DataIntegration',
      'ConfigureEmbedding',
    ];

    const qcSteps = await getQcStepsToRun(fake.EXPERIMENT_ID, [], completedSteps, 'SUCCEEDED');
    expect(qcSteps).toEqual(['ConfigureEmbedding']);
    const stateMachine = buildQCPipelineSteps(qcSteps);
    expect(stateMachine).toMatchSnapshot();
  });

  it('Throws if the config has no changes', async () => {
    mockCellLevelMetadataCheck('sameCellLevelId', 'sameCellLevelId');

    const completedSteps = [
      'ClassifierFilter',
      'CellSizeDistributionFilter',
      'MitochondrialContentFilter',
      'NumGenesVsNumUmisFilter',
    ];

    expect(async () => await getQcStepsToRun(fake.EXPERIMENT_ID, [], completedSteps, 'SUCCEEDED')).rejects.toThrow();
  });
});
