// @ts-nocheck
const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const MetadataTrack = require('../../../src/api.v2/model/MetadataTrack');

describe('model/userAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createNewExperimentPermissions works correctly when experiment has metadata tracks', async () => {
    const mockExperimentId = 'mockExperimentId';
    const mockSampleId = 'mockSampleId';

    mockSqlClient.where.mockImplementationOnce(() => Promise.resolve([{ id: 'track1Id' }, { id: 'track2Id' }]));

    await new MetadataTrack().createNewSampleValues(mockExperimentId, mockSampleId);

    expect(mockSqlClient.insert).toHaveBeenCalledWith([
      { metadata_track_id: 'track1Id', sample_id: 'mockSampleId', value: 'N.A.' },
      { metadata_track_id: 'track2Id', sample_id: 'mockSampleId', value: 'N.A.' },
    ]);
  });

  it('createNewExperimentPermissions doesn\'t do anything when experiment has no metadata tracks', async () => {
    const mockExperimentId = 'mockExperimentId';
    const mockSampleId = 'mockSampleId';

    mockSqlClient.where.mockImplementationOnce(() => Promise.resolve([]));

    await new MetadataTrack().createNewSampleValues(mockExperimentId, mockSampleId);

    expect(mockSqlClient.insert).not.toHaveBeenCalled();
  });
});
