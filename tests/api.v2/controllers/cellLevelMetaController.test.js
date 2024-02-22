// @ts-nocheck
const cellLevelMetaController = require('../../../src/api.v2/controllers/cellLevelMetaController');
const CellLevelMeta = require('../../../src/api.v2/model/CellLevelMeta');
const CellLevelMetaToExperiment = require('../../../src/api.v2/model/CellLevelMetaToExperiment');
const { createMultipartUpload } = require('../../../src/api.v2/helpers/s3/signedUrl');
const { OK } = require('../../../src/utils/responses');
const bucketNames = require('../../../src/config/bucketNames');
const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/model/CellLevelMeta');
jest.mock('../../../src/api.v2/model/CellLevelMetaToExperiment');
jest.mock('../../../src/api.v2/helpers/s3/signedUrl');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));
const cellLevelInstance = new CellLevelMeta();
mockSqlClient.transaction = jest.fn((callback) => callback(mockTrx));

const mockRes = {
  json: jest.fn(),
};

describe('CellLevelMetaController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test for the `upload` method
  it('upload method works correctly', async () => {
    const mockReq = {
      params: { experimentId: 'experimentId' },
      body: { name: 'cellLevelMetaFileName', size: 12345 },
    };

    const mockUploadUrlParams = { url: 'signedUrl', fileId: 'fileId' };

    createMultipartUpload.mockResolvedValue(mockUploadUrlParams);
    await cellLevelMetaController.upload(mockReq, mockRes);

    expect(CellLevelMeta).toHaveBeenCalledWith(mockTrx);
    expect(CellLevelMetaToExperiment).toHaveBeenCalledWith(mockTrx);
    expect(createMultipartUpload).toHaveBeenCalledWith(
      expect.any(String), {}, bucketNames.CELL_LEVEL_META,
    );

    expect(mockRes.json).toHaveBeenCalledWith(
      { data: expect.objectContaining({ fileId: expect.any(String) }) },
    );
  });

  // Test for the `update` method
  CellLevelMeta.prototype.updateById = jest.fn();
  CellLevelMetaToExperiment.prototype.find = jest.fn().mockReturnValue({
    first: jest.fn().mockResolvedValue({ cellMetadataFileId: 'cellMetadataFileId' }),
  });

  // Define the test
  it('update method works correctly', async () => {
    const mockReq = {
      params: { experimentId: 'experimentId' },
      body: { uploadStatus: 'uploaded' },
    };

    await cellLevelMetaController.update(mockReq, mockRes);

    expect(CellLevelMetaToExperiment.prototype.find).toHaveBeenCalledWith({
      experiment_id: 'experimentId',
    });

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('download method works correctly', async () => {
    const mockReq = {
      params: { fileId: 'fileId', fileName: 'cellLevelMetaFileName' },
    };

    await cellLevelMetaController.download(mockReq, mockRes);
    CellLevelMeta.prototype.getDownloadLink = jest.fn();

    expect(CellLevelMeta).toHaveBeenCalled();
    await expect(cellLevelInstance.getDownloadLink).toHaveBeenCalledWith('fileId', 'cellLevelMetaFileName');
  });

  it('deleteMeta method works correctly', async () => {
    const mockReq = {
      params: { experimentId: 'experimentId' },
    };

    await cellLevelMetaController.deleteMeta(mockReq, mockRes);

    expect(CellLevelMetaToExperiment).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });
});
