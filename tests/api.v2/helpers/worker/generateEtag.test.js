const generateETag = require('../../../../src/api.v2/helpers/worker/generateEtag');
const getExperimentBackendStatus = require('../../../../src/api.v2/helpers/backendStatus/getExperimentBackendStatus');
const getExtraDependencies = require('../../../../src/api.v2/helpers/worker/workSubmit/getExtraDependencies');

jest.mock('../../../../src/api.v2/helpers/backendStatus/getExperimentBackendStatus');
jest.mock('../../../../src/api.v2/helpers/worker/workSubmit/getExtraDependencies');

const experimentId = 'experiment-id';

const data = {
  experimentId,
  body: { name: 'GetEmbedding' },
  requestProps: { broadcast: false, cacheUniquenessKey: null },
};

const backendStatus = ({ qcStartDate = null, obj2sStartDate = null }) => ({
  pipeline: { startDate: qcStartDate },
  obj2s: { startDate: obj2sStartDate },
});

describe('generateETag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getExtraDependencies.mockResolvedValue([]);
  });

  it('produces a different ETag when the obj2s pipeline is re-run (QC never runs for obj2s)', async () => {
    // obj2s experiments never run QC, so qc startDate stays null. The obj2s
    // start date must feed the ETag so re-uploads invalidate stale worker results.
    getExperimentBackendStatus.mockResolvedValueOnce(
      backendStatus({ obj2sStartDate: '2024-01-01T00:00:00.000Z' }),
    );
    const firstETag = await generateETag(data);

    getExperimentBackendStatus.mockResolvedValueOnce(
      backendStatus({ obj2sStartDate: '2024-02-02T00:00:00.000Z' }),
    );
    const secondETag = await generateETag(data);

    expect(firstETag).not.toEqual(secondETag);
  });

  it('is unaffected by the obj2s start date for gem2s/QC experiments', async () => {
    // When QC has run, its start date drives the ETag and the obj2s date is ignored,
    // keeping ETags stable for existing gem2s experiments.
    getExperimentBackendStatus.mockResolvedValueOnce(
      backendStatus({ qcStartDate: '2024-01-01T00:00:00.000Z' }),
    );
    const firstETag = await generateETag(data);

    getExperimentBackendStatus.mockResolvedValueOnce(
      backendStatus({ qcStartDate: '2024-01-01T00:00:00.000Z', obj2sStartDate: '2024-02-02T00:00:00.000Z' }),
    );
    const secondETag = await generateETag(data);

    expect(firstETag).toEqual(secondETag);
  });
});
