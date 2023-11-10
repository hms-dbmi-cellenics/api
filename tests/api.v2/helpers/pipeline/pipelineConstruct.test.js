const fetchMock = require('jest-fetch-mock');
const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');


const AWS = require('../../../../src/utils/requireAWS');
const { getQcPipelineStepNames } = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/skeletons');

const CellLevelMeta = require('../../../../src/api.v2/model/CellLevelMeta');
const Experiment = require('../../../../src/api.v2/model/Experiment');
const ExperimentExecution = require('../../../../src/api.v2/model/ExperimentExecution');
const { createSubsetPipeline, createCopyPipeline } = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct');
const { cancelPreviousPipelines } = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/utils');

const cellLevelMetaInstance = new CellLevelMeta();
const experimentInstance = new Experiment();
const experimentExecutionInstance = new ExperimentExecution();

const mockStepNames = getQcPipelineStepNames();

const mockExperimentRow = require('../../mocks/data/experimentRow.json');

jest.mock('../../../../src/api.v2/helpers/pipeline/batch/terminateJobs');
jest.mock('../../../../src/api.v2/helpers/pipeline/batch/listJobsToDelete');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/podCleanup');

const { createQCPipeline, createGem2SPipeline, createSeuratPipeline } = jest.requireActual('../../../../src/api.v2/helpers/pipeline/pipelineConstruct');

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: () => Buffer.from('asdfg'),
}));

jest.mock('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/qcHelpers', () => ({
  getQcStepsToRun: jest.fn(() => mockStepNames),
  ...jest.requireActual('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/qcHelpers'),
}));

jest.mock('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/utils', () => ({
  ...jest.requireActual('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/utils'),
  cancelPreviousPipelines: jest.fn(() => Promise.resolve()),
}));



jest.mock('../../../../src/utils/asyncTimer');
jest.mock('../../../../src/api.v2/model/Experiment');
jest.mock('../../../../src/api.v2/model/CellLevelMeta');
jest.mock('../../../../src/api.v2/model/ExperimentExecution');
fetchMock.enableFetchMocks();

describe('test for pipeline services', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    fetchMock.mockResponse('');
  });

  afterEach(() => {
    AWSMock.restore('EKS');
    AWSMock.restore('StepFunctions');
  });

  const mockCluster = {
    cluster: {
      name: 'biomage-test',
      endpoint: 'https://test-endpoint.me/fgh',
      certificateAuthority: {
        data: 'AAAAAAAAAAA',
      },
    },
  };

  const processingConfigUpdate = {
    doubletScores: {
      oneSample: {
        defaultFilterSettings: {
          oneSetting: 1,
        },
        filterSettings: {
          oneSetting: 7,
        },
      },
      otherSample: {
        filterSettings: {
          oneSetting: 15,
        },
      },
    },
  };

  it('Create QC pipeline works', async () => {
    const describeClusterSpy = jest.fn((x) => x);
    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      describeClusterSpy(params);
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      (stateMachineObject) => _.omit(stateMachineObject, ['definition', 'image']),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-machine' });
    });

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(mockExperimentRow) },
    );

    cellLevelMetaInstance.getMetadataByExperimentIds.mockImplementationOnce(
      () => Promise.resolve([
        {
          id: '2c5983db-c690-4ed3-a4ad-bb12b065d60d',
          name: 'test_cell_lvl_meta.tsv',
          uploadStatus: 'uploaded',
          createdAt: '2023-11-01 14:29:26.765022+00',
          experimentId: 'testExperimentId',
        },
      ]),
    );

    await createQCPipeline('testExperimentId', processingConfigUpdate);
    expect(describeClusterSpy).toMatchSnapshot();

    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(experimentInstance.findById).toHaveBeenCalledWith('testExperimentId');
    expect(experimentExecutionInstance.upsert.mock.calls).toMatchSnapshot();

    expect(cellLevelMetaInstance.getMetadataByExperimentIds).toHaveBeenCalledWith(['testExperimentId']);

    // Updates the processing config with the new changes
    expect(experimentInstance.updateById).toHaveBeenCalledTimes(1);
    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot('experimentInstance processingConfig update');

    expect(createActivitySpy).toHaveBeenCalled();
    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });

  it('Parses QC processingConfig with cell level metadata file correctly', async () => {
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      // eslint-disable-next-line consistent-return
      (stateMachineObject) => (_.cloneDeepWith(JSON.parse(stateMachineObject.definition), (o) => {
        if (_.isObject(o) && o.image) {
          return {
            ...o,
            image: 'MOCK_IMAGE_PATH',
          };
        }

        if (_.isObject(o) && o.ref) {
          return {
            ...o,
            ref: 'MOCK_REF_PATH',
          };
        }
      })),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      callback(null, { executionArn: 'test-machine' });
    });

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(mockExperimentRow) },
    );

    cellLevelMetaInstance.getMetadataByExperimentIds.mockImplementationOnce(
      () => Promise.resolve([
        {
          id: '2c5983db-c690-4ed3-a4ad-bb12b065d60d',
          name: 'test_cell_lvl_meta.tsv',
          uploadStatus: 'uploaded',
          createdAt: '2023-11-01 14:29:26.765022+00',
          experimentId: 'testExperimentId',
        },
      ]),
    );

    await createQCPipeline('testExperimentId', processingConfigUpdate);
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();
    expect(cellLevelMetaInstance.getMetadataByExperimentIds).toHaveBeenCalledWith(['testExperimentId']);
  });

  it('Parses QC processingConfig with no cell level metadata file correctly', async () => {
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      // eslint-disable-next-line consistent-return
      (stateMachineObject) => (_.cloneDeepWith(JSON.parse(stateMachineObject.definition), (o) => {
        if (_.isObject(o) && o.image) {
          return {
            ...o,
            image: 'MOCK_IMAGE_PATH',
          };
        }

        if (_.isObject(o) && o.ref) {
          return {
            ...o,
            ref: 'MOCK_REF_PATH',
          };
        }
      })),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      callback(null, { executionArn: 'test-machine' });
    });

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(mockExperimentRow) },
    );

    cellLevelMetaInstance.getMetadataByExperimentIds.mockImplementationOnce(
      () => Promise.resolve([]),
    );

    await createQCPipeline('testExperimentId', processingConfigUpdate);
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();
    expect(cellLevelMetaInstance.getMetadataByExperimentIds).toHaveBeenCalledWith(['testExperimentId']);
  });

  it('Parses QC processingConfig raised an error when more than one cell level metadata files exist', async () => {
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      // eslint-disable-next-line consistent-return
      (stateMachineObject) => (_.cloneDeepWith(JSON.parse(stateMachineObject.definition), (o) => {
        if (_.isObject(o) && o.image) {
          return {
            ...o,
            image: 'MOCK_IMAGE_PATH',
          };
        }

        if (_.isObject(o) && o.ref) {
          return {
            ...o,
            ref: 'MOCK_REF_PATH',
          };
        }
      })),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      callback(null, { executionArn: 'test-machine' });
    });

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(mockExperimentRow) },
    );

    cellLevelMetaInstance.getMetadataByExperimentIds.mockImplementationOnce(
      () => Promise.resolve([
        {
          id: '2c5983db-c690-4ed3-a4ad-bb12b065d60d',
          name: 'test_cell_lvl_meta.tsv',
          uploadStatus: 'uploaded',
          createdAt: '2023-11-01 14:29:26.765022+00',
          experimentId: 'testExperimentId',
        },
        {
          id: '3c5983db-c690-4ed3-a4ad-bb12b065d60d',
          name: 'test_cell_lvl_meta.tsv',
          uploadStatus: 'uploaded',
          createdAt: '2023-11-01 14:29:26.765022+00',
          experimentId: 'testExperimentId',
        },
      ]),
    );

    await expect(createQCPipeline('testExperimentId', processingConfigUpdate))
      .rejects
      .toThrow('Experiment testExperimentId cannot have more than one cell level metadata file');
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();
    expect(cellLevelMetaInstance.getMetadataByExperimentIds).toHaveBeenCalledWith(['testExperimentId']);
  });

  it('Create Gem2s pipeline works', async () => {
    AWSMock.setSDKInstance(AWS);

    const describeClusterSpy = jest.fn((x) => x);
    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      describeClusterSpy(params);
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      (stateMachineObject) => _.omit(stateMachineObject, ['definition', 'image']),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-machine' });
    });

    await createGem2SPipeline(
      'testExperimentId',
      {
        projectId: 'test-project',
        experimentName: 'valerio-massala',
        organism: null,
        input: { type: '10x' },
        sampleIds: ['3af6b6bb-a1aa-4375-9c2c-c112bada56ca'],
        sampleNames: ['sample-1'],
      },
    );

    expect(describeClusterSpy).toMatchSnapshot();

    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(createActivitySpy).toHaveBeenCalled();
    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });

  it('Create Subset pipeline works', async () => {
    AWSMock.setSDKInstance(AWS);

    const describeClusterSpy = jest.fn((x) => x);
    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      describeClusterSpy(params);
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      (stateMachineObject) => _.omit(stateMachineObject, ['definition', 'image']),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-machine' });
    });

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(mockExperimentRow) },
    );

    await createSubsetPipeline(
      'fromExperimentId',
      'toExperimentId',
      'toExperimentName',
      ['louvain-1', 'louvain-2'],
      mockExperimentRow.processingConfig,
      'mockAuthJWT',
    );

    expect(describeClusterSpy).toMatchSnapshot();

    expect(createStateMachineSpy.mock.calls).toMatchSnapshot('createStateMachineSpy calls');
    expect(createStateMachineSpy.mock.results).toMatchSnapshot('createStateMachineSpy results');

    expect(createActivitySpy).toHaveBeenCalled();
    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();

    // It cancelled previous pipelines on this experiment
    expect(cancelPreviousPipelines).toHaveBeenCalled();
  });

  it('Create copy pipeline works', async () => {
    AWSMock.setSDKInstance(AWS);

    const describeClusterSpy = jest.fn((x) => x);
    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      describeClusterSpy(params);
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      (stateMachineObject) => _.omit(stateMachineObject, ['definition', 'image']),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-machine' });
    });

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(mockExperimentRow) },
    );

    const sampleIdsMap = { originalSampleId1: 'clonedSampleId1', originalSampleId2: 'clonedSampleId2' };

    await createCopyPipeline(
      'fromExperimentId',
      'toExperimentId',
      sampleIdsMap,
    );

    expect(describeClusterSpy).toMatchSnapshot();

    expect(createStateMachineSpy.mock.calls).toMatchSnapshot('createStateMachineSpy calls');
    expect(createStateMachineSpy.mock.results).toMatchSnapshot('createStateMachineSpy results');

    expect(createActivitySpy).toHaveBeenCalled();
    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });
});
