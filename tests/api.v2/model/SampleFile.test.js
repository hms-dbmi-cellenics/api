// @ts-nocheck
// Disabled ts because it doesn't recognize jest mocks
const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

jest.mock('../../../src/sql/helpers', () => ({
  collapseKeysIntoObject: jest.fn(),
  collapseKeyIntoArray: jest.fn(),
}));

const SampleFile = require('../../../src/api.v2/model/SampleFile');
const tableNames = require('../../../src/api.v2/model/tableNames');

const mockSampleId = 'mockSampleId';
const mockSampleFileType = 'features10x';

describe('model/Sample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allFilesForSample works correctly', async () => {
    const mockSampleFileIdObjects = [{ sampleFileId: 'id1' }, { sampleFileId: 'id2' }];
    const mockSampleFileIds = ['id1', 'id2'];

    const files = [
      {
        id: mockSampleFileIds[0], sampleFileType: 'features10x', size: 12, s3Path: '123', uploadStatus: 'uploaded', uploadedAt: '1',
      },
      {
        id: mockSampleFileIds[1], sampleFileType: 'matrix10x', size: 12, s3Path: '124', uploadStatus: 'uploaded', uploadedAt: '2',
      },
    ];

    mockSqlClient.where.mockReturnValueOnce(mockSampleFileIdObjects);
    mockSqlClient.whereIn.mockReturnValueOnce(files);

    const result = await new SampleFile().allFilesForSample(mockSampleId);

    expect(result).toEqual(files);

    expect(mockSqlClient).toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);
    expect(mockSqlClient.select).toHaveBeenCalledWith('sample_file_id');
    expect(mockSqlClient.where).toHaveBeenCalledWith({ sample_id: mockSampleId });

    expect(mockSqlClient).toHaveBeenCalledWith(tableNames.SAMPLE_FILE);
    expect(mockSqlClient.select).toHaveBeenCalledWith();
    expect(mockSqlClient.whereIn).toHaveBeenCalledWith('id', mockSampleFileIds);
  });

  it('updateUploadStatus works correctly if valid params are passed', async () => {
    const mockUploadStatus = 'fileNotFound';

    const sfIdRef = 'sf.idRef';
    mockSqlClient.ref.mockReturnValueOnce(sfIdRef);

    await new SampleFile().updateUploadStatus(mockSampleId, mockSampleFileType, mockUploadStatus);

    expect(mockSqlClient).toHaveBeenCalledWith({ sf: tableNames.SAMPLE_FILE });
    expect(mockSqlClient.update).toHaveBeenCalledWith({ upload_status: mockUploadStatus });
    expect(mockSqlClient.whereExists).toHaveBeenCalled();

    expect(mockSqlClient).toHaveBeenCalledWith({ sf_map: tableNames.SAMPLE_TO_SAMPLE_FILE_MAP });
    expect(mockSqlClient.select).toHaveBeenCalledWith(['sample_file_id']);
    expect(mockSqlClient.where).toHaveBeenCalledWith('sf_map.sample_file_id', '=', sfIdRef);
    expect(mockSqlClient.where).toHaveBeenCalledWith('sf_map.sample_id', '=', mockSampleId);
    expect(mockSqlClient.andWhere).toHaveBeenCalledWith({ sample_file_type: mockSampleFileType });
  });
});
