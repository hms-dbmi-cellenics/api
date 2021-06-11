const constants = require('../../../src/api/general-services/pipeline-manage/constants');

const ExperimentService = require('../../../src/api/route-services/experiment.js');
const getPipelineStatus = require('../../../src/api/general-services/pipeline-status');

const Gem2sService = require('../../../src/api/route-services/gem2s');

const {
  RUNNING, SUCCEEDED, NOT_CREATED, FAILED, TIMED_OUT, ABORTED, GEM2S_PROCESS_NAME, QC_PROCESS_NAME,
} = constants;

jest.mock('../../../src/api/route-services/experiment.js');
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
});
