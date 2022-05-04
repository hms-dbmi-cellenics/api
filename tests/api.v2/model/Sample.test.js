const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

const Sample = require('../../../src/api.v2/model/Sample');

const mockExperimentId = 'mockExperimentId';
// @ts-nocheck
// Disabled ts because it doesn't recognize jest mocks
const tableNames = require('../../../src/api.v2/model/tableNames');
const { replaceNullsWithObject } = require('../../../src/sql/helpers');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

jest.mock('../../../src/sql/helpers', () => ({
  collapseKeysIntoObject: jest.fn(),
  collapseKeyIntoArray: jest.fn(),
  replaceNullsWithObject: jest.fn(),
}));

const mockSampleId = 'mockSampleId';
const mockSampleFileId = 'sampleFileId';
const mockSampleFileType = 'features10x';


describe('model/Sample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Get samples works correctly', async () => {
    await new Sample().getSamples(mockExperimentId).toString();
    expect(replaceNullsWithObject).toHaveBeenCalledWith('jsonb_object_agg(key, value)', 'key');
    expect(mockSqlClient.where.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.from.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.select.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.join.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.groupBy.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.raw.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.leftJoin.mock.calls).toMatchSnapshot();
  });

  it('setNewFile works correctly if valid params are passed', async () => {
    mockTrx.ref.mockImplementationOnce(() => 'sf_mapsample_file_idRef');

    await new Sample().setNewFile(mockSampleId, mockSampleFileId, mockSampleFileType);

    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);

    // Test delete from SAMPLE_TO_SAMPLE_FILE_MAP query
    expect(mockTrx.from).toHaveBeenCalledWith({ sf_map: tableNames.SAMPLE_TO_SAMPLE_FILE_MAP });
    expect(mockTrx.where).toHaveBeenCalledWith({ sample_id: mockSampleId });
    expect(mockTrx.andWhere).toHaveBeenCalledWith('sample_file_id', '=', expect.anything());

    expect(mockTrx.select).toHaveBeenCalledWith(['id']);
    expect(mockTrx.from).toHaveBeenCalledWith({ sf: tableNames.SAMPLE_FILE });
    expect(mockTrx.where).toHaveBeenCalledWith('sf.id', '=', 'sf_mapsample_file_idRef');
    expect(mockTrx.andWhere).toHaveBeenCalledWith('sf.sample_file_type', '=', mockSampleFileType);

    // Test add new sample file reference
    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);
    expect(mockTrx.insert).toHaveBeenCalledWith({
      sample_id: mockSampleId,
      sample_file_id: mockSampleFileId,
    });
  });
});
