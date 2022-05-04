// @ts-nocheck
const metadataTrackController = require('../../../src/api.v2/controllers/metadataTrackController');
const { OK, NotFoundError } = require('../../../src/utils/responses');
const MetadataTrack = require('../../../src/api.v2/model/MetadataTrack');

const metadataTrackInstance = new MetadataTrack();

jest.mock('../../../src/api.v2/model/MetadataTrack');

const mockRes = {
  json: jest.fn(),
};

describe('metadataTrackController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('createMetadataTrack works correctly', async () => {
    const experimentId = 'experimentId';
    const metadataTrackKey = 'metadataTrackKey';

    const mockReq = {
      params: { experimentId, metadataTrackKey },
    };

    await metadataTrackController.createMetadataTrack(mockReq, mockRes);

    expect(
      metadataTrackInstance.createNewMetadataTrack,
    ).toHaveBeenCalledWith(experimentId, metadataTrackKey);

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('patchMetadataTrack works correctly', async () => {
    const experimentId = 'experimentId';
    const oldMetadataTrackKey = 'oldKey';
    const newMetadataTrackKey = 'newKey';

    const mockReq = {
      params: { experimentId, metadataTrackKey: oldMetadataTrackKey },
      body: { key: newMetadataTrackKey },
    };

    metadataTrackInstance.update.mockImplementationOnce(
      () => [{ id: 1, experimentId, key: newMetadataTrackKey }],
    );

    await metadataTrackController.patchMetadataTrack(mockReq, mockRes);

    expect(metadataTrackInstance.update).toHaveBeenCalledWith(
      { experiment_id: experimentId, key: oldMetadataTrackKey },
      { key: newMetadataTrackKey },
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('patchMetadataTrack throws if it didnt find a row to update', async () => {
    const experimentId = 'experimentId';
    const oldMetadataTrackKey = 'oldKey';
    const newMetadataTrackKey = 'newKey';

    const mockReq = {
      params: { experimentId, metadataTrackKey: oldMetadataTrackKey },
      body: { key: newMetadataTrackKey },
    };

    metadataTrackInstance.update.mockImplementationOnce(() => []);

    await expect(
      metadataTrackController.patchMetadataTrack(mockReq, mockRes),
    ).rejects.toThrow(
      new NotFoundError(`Metadata track ${oldMetadataTrackKey} not found`),
    );

    // Response is not generated in controller
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('deleteMetadataTrack works correctly', async () => {
    const experimentId = 'experimentId';
    const metadataTrackKey = 'key';

    const mockReq = { params: { experimentId, metadataTrackKey } };

    metadataTrackInstance.delete.mockImplementationOnce(
      () => [{ id: 1, experimentId, key: metadataTrackKey }],
    );

    await metadataTrackController.deleteMetadataTrack(mockReq, mockRes);

    expect(metadataTrackInstance.delete).toHaveBeenCalledWith(
      { experiment_id: experimentId, key: metadataTrackKey },
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('deleteMetadataTrack throws if it didnt find a row to delete', async () => {
    const experimentId = 'experimentId';
    const metadataTrackKey = 'key';

    const mockReq = { params: { experimentId, metadataTrackKey } };

    metadataTrackInstance.delete.mockImplementationOnce(() => []);

    await expect(
      metadataTrackController.deleteMetadataTrack(mockReq, mockRes),
    ).rejects.toThrow(
      new NotFoundError(`Metadata track ${metadataTrackKey} not found`),
    );

    expect(metadataTrackInstance.delete).toHaveBeenCalledWith(
      { experiment_id: experimentId, key: metadataTrackKey },
    );

    // Response is not generated in controller
    expect(mockRes.json).not.toHaveBeenCalledWith(OK());
  });

  it('patchSampleInMetadataTrackValue works correctly', async () => {
    const experimentId = 'experimentId';
    const metadataTrackKey = 'key';
    const sampleId = 'sampleId';
    const value = 'value';

    const mockReq = {
      params: { experimentId, sampleId, metadataTrackKey },
      body: { value },
    };

    metadataTrackInstance.patchValueForSample.mockImplementationOnce(() => Promise.resolve());

    await metadataTrackController.patchValueForSample(mockReq, mockRes);

    expect(metadataTrackInstance.patchValueForSample).toHaveBeenCalledWith(
      experimentId, sampleId, metadataTrackKey, value,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });
});
