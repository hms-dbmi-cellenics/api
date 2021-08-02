const constants = require('../../../src/api/general-services/pipeline-manage/constants');

const ExperimentService = require('../../../src/api/route-services/experiment');
const SamplesService = require('../../../src/api/route-services/samples');
const ProjectsService = require('../../../src/api/route-services/projects');
const getPipelineStatus = require('../../../src/api/general-services/pipeline-status');

const Gem2sService = require('../../../src/api/route-services/gem2s');

const {
  RUNNING, SUCCEEDED, NOT_CREATED, FAILED, TIMED_OUT, GEM2S_PROCESS_NAME, QC_PROCESS_NAME,
} = constants;

jest.mock('../../../src/api/route-services/experiment');
jest.mock('../../../src/api/route-services/samples');
jest.mock('../../../src/api/route-services/projects');
jest.mock('../../../src/api/general-services/pipeline-status');

describe('gem2sShouldRun', () => {
  const mockEmptyHandles = {
    [GEM2S_PROCESS_NAME]: {
      stateMachineArn: null,
      executionArn: null,
    },
    [QC_PROCESS_NAME]: {
      stateMachineArn: null,
      executionArn: null,
    },
  };

  const mockFilledHandles = {
    [GEM2S_PROCESS_NAME]: {
      stateMachineArn: 'arnSM_gem2s',
      executionArn: 'arnE_sem2s',
      paramsHash: 'sameHash',
    },
    [QC_PROCESS_NAME]: {
      stateMachineArn: 'arnSM_qc',
      executionArn: 'arnE_qc',
    },
  };

  beforeEach(() => {
    ExperimentService.mockClear();
  });

  it('returns true when gem2s is not created yet', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockEmptyHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: NOT_CREATED } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', null);

    expect(shouldRun).toEqual(true);
  });

  it('returns true when gem2s failed', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: FAILED } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'newHash');

    expect(shouldRun).toEqual(true);
  });

  it('returns true when gem2s failed', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: FAILED } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'newHash');

    expect(shouldRun).toEqual(true);
  });

  it('returns true when gem2s timed out', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: TIMED_OUT } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'newHash');

    expect(shouldRun).toEqual(true);
  });

  it('returns true when gem2s timed out', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: TIMED_OUT } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'newHash');

    expect(shouldRun).toEqual(true);
  });

  it('returns true when gem2s aborted', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: TIMED_OUT } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'newHash');

    expect(shouldRun).toEqual(true);
  });

  it('returns false when gem2s is running', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: RUNNING } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'newHash');

    expect(shouldRun).toEqual(false);
  });

  it('returns false when gem2s succeeded but has the same params hash as the latest run', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: SUCCEEDED } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'sameHash');

    expect(shouldRun).toEqual(false);
  });

  it('returns true when gem2s succeeded and has a different params hash as the latest run', async () => {
    ExperimentService.mockImplementation(() => ({
      getPipelinesHandles: () => Promise.resolve(mockFilledHandles),
    }));

    getPipelineStatus.mockImplementation(
      () => Promise.resolve(
        { [GEM2S_PROCESS_NAME]: { status: SUCCEEDED } },
      ),
    );

    const shouldRun = await Gem2sService.gem2sShouldRun('experimentId', 'differentHash');

    expect(shouldRun).toEqual(true);
  });


  it('generateGem2sTaskParams returns the same hash param if passed diferent information on non-vital fields', async () => {
    ExperimentService.mockImplementation(() => ({
      getExperimentData: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          projectId: 'project-1',
          experimentName: 'New experiment',
          meta: {
            organism: null,
            type: '10x',
          },
          sampleIds: ['sample-1', 'sample-2'],
        })),
    }));

    SamplesService.mockImplementation(() => ({
      getSamplesByExperimentId: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          samples: {
            'sample-1': { name: 'Sample 1' },
            'sample-2': { name: 'Sample 2' },
          },
        })),
    }));

    ProjectsService.mockImplementation(() => ({
      getProject: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ metadataKeys: [] })),
    }));

    const { taskParams: task1, hashParams: hash1 } = await Gem2sService.generateGem2sParams('experimentId');

    ExperimentService.mockImplementation(() => ({
      getExperimentData: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          projectId: 'project-2', // Changed
          experimentName: 'Another new experiment', // Changed
          meta: {
            organism: null,
            type: '10x',
          },
          sampleIds: ['sample-1', 'sample-2'],
        })),
    }));

    SamplesService.mockImplementation(() => ({
      getSamplesByExperimentId: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          samples: {
            'sample-1': { name: 'Sample 1' },
            'sample-2': { name: 'Sample 2' },
          },
        })),
    }));

    ProjectsService.mockImplementation(() => ({
      getProject: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ metadataKeys: [] })),
    }));


    const { taskParams: task2, hashParams: hash2 } = await Gem2sService.generateGem2sParams('experimentId');

    expect(hash1).toEqual(hash2);
  });

  it('generateGem2sTaskParams returns different hash param if passed diferent information on vital fields', async () => {
    ExperimentService.mockImplementation(() => ({
      getExperimentData: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          projectId: 'project-2',
          experimentName: 'New experiment',
          meta: {
            organism: null,
            type: '10x',
          },
          sampleIds: ['sample-2', 'sample-1'],
        })),
    }));

    SamplesService.mockImplementation(() => ({
      getSamplesByExperimentId: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          samples: {
            'sample-1': { name: 'Sample 1' },
            'sample-2': { name: 'Sample 2' },
          },
        })),
    }));

    ProjectsService.mockImplementation(() => ({
      getProject: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ metadataKeys: [] })),
    }));

    const { taskParams: task1, hashParams: hash1 } = await Gem2sService.generateGem2sParams('experimentId');

    // Remaking the mock

    ExperimentService.mockImplementation(() => ({
      getExperimentData: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          projectId: 'project-3',
          experimentName: 'Another new experiment',
          meta: {
            organism: null,
            type: '10x',
          },
          sampleIds: ['sample-1', 'sample-2'], // Different sample order
          metadataKeys: ['meta-1'],
        })),
    }));

    SamplesService.mockImplementation(() => ({
      getSamplesByExperimentId: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({
          samples: {
            'sample-1': { name: 'Sample A', metadata: { 'meta-1': 'Meta A' } },
            'sample-2': { name: 'Sample B', metadata: { 'meta-1': 'Meta B' } }, // Different sample names
          },
        })),
    }));

    ProjectsService.mockImplementation(() => ({
      getProject: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ metadataKeys: ['meta-1'] })), // Addition of metadata key
    }));


    const { taskParams: task2, hashParams: hash2 } = await Gem2sService.generateGem2sParams('experimentId');

    expect(hash1).not.toEqual(hash2);
  });
});
