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

    mockSqlClient.where.mockImplementationOnce(() => Promise.resolve(['track1Id', 'track2Id']));

    await new MetadataTrack().createNewSampleValues(mockExperimentId, mockSampleId);
  });
});
