// @ts-nocheck
const fs = require('fs');
const path = require('path');
const metadataTrackController = require('../../../src/api.v2/controllers/metadataTrackController');
const { OK, NotFoundError, BadRequestError } = require('../../../src/utils/responses');
const MetadataTrack = require('../../../src/api.v2/model/MetadataTrack');
const Sample = require('../../../src/api.v2/model/Sample');

const metadataTrackInstance = new MetadataTrack();
const sampleInstance = new Sample();

const mockMetadataSampleNameToId = {
  'sample 1': 'mockSample1',
  'sample 2': 'mockSample2',
  'sample 3': 'mockSample3',
};

jest.mock('../../../src/api.v2/model/MetadataTrack');
jest.mock('../../../src/api.v2/model/Sample');

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

  it('createMetadataFromFile works correctly', async () => {
    const experimentId = 'experimentId';
    const tsvData = [
      'sample1\tmetadata_key_1\tmetadata_value_1',
      'sample2\tmetadata_key_1\tmetadata_value_2',
      'sample2\tmetadata_key_2\tmetadata_value_4',
    ].join('\n');

    const mockSamples = [{
      id: 'id1',
      name: 'sample1',
    }, {
      id: 'id2',
      name: 'sample2',
    }];

    const metadataUpdateObject = [
      { metadataKey: 'metadata_key_1', metadataValue: 'metadata_value_1', sampleId: 'id1' },
      { metadataKey: 'metadata_key_1', metadataValue: 'metadata_value_2', sampleId: 'id2' },
      { metadataKey: 'metadata_key_2', metadataValue: 'metadata_value_4', sampleId: 'id2' }];


    const mockReq = {
      params: { experimentId },
      body: tsvData,
    };

    metadataTrackInstance.bulkUpdateMetadata.mockImplementationOnce(() => Promise.resolve());
    sampleInstance.find.mockReturnValue(mockSamples);

    await metadataTrackController.createMetadataFromFile(mockReq, mockRes);

    expect(metadataTrackInstance.bulkUpdateMetadata).toHaveBeenCalledWith(
      experimentId, metadataUpdateObject,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('createMetadataFromFile throws BadRequest for incorrect sample names', async () => {
    const experimentId = 'experimentId';
    const tsvData = [
      'wrong_sampel\tmetadata_key_1\tmetadata_value_1',
    ].join('\n');

    const mockSamples = [{
      id: 'id1',
      name: 'sample1',
    }];


    const mockReq = {
      params: { experimentId },
      body: tsvData,
    };

    metadataTrackInstance.bulkUpdateMetadata.mockImplementationOnce(() => Promise.resolve());
    sampleInstance.find.mockReturnValue(mockSamples);

    await expect(
      metadataTrackController.createMetadataFromFile(mockReq, mockRes),
    ).rejects.toThrowError(BadRequestError);
  });

  it('parseMetadataFromTSV parses correctly', () => {
    const mockData = fs.readFileSync(path.join(__dirname, '../mocks/data/metadata.tsv'), { encoding: 'utf-8' });
    const result = metadataTrackController.parseMetadataFromTSV(
      mockData, mockMetadataSampleNameToId,
    );
    expect(result).toMatchSnapshot();
  });

  it('parseMetadataFromTSV throws error if there are invalid samples', () => {
    const mockData = fs.readFileSync(path.join(__dirname, '../mocks/data/metadataInvalidSamples.tsv'), { encoding: 'utf-8' });

    expect(() => {
      metadataTrackController.parseMetadataFromTSV(mockData, mockMetadataSampleNameToId);
    }).toThrowErrorMatchingSnapshot();
  });

  it('parseMetadataFromTSV throws error if there are invalid lines', () => {
    const mockData = fs.readFileSync(path.join(__dirname, '../mocks/data/metadataInvalidLines.tsv'), { encoding: 'utf-8' });

    expect(() => {
      metadataTrackController.parseMetadataFromTSV(mockData, mockMetadataSampleNameToId);
    }).toThrowErrorMatchingSnapshot();
  });

  it('parseMetadataFromTSV tolerates spaces after a line', () => {
    const mockData = fs.readFileSync(path.join(__dirname, '../mocks/data/metadataWithTrackSpaces.tsv'), { encoding: 'utf-8' });
    const result = metadataTrackController.parseMetadataFromTSV(
      mockData, mockMetadataSampleNameToId,
    );
    expect(result).toMatchSnapshot();
  });

  it('parseMetadataFromTSV can parse metadata tracks with spaces', () => {
    const mockData = fs.readFileSync(path.join(__dirname, '../mocks/data/metadataWithLineSpaces.tsv'), { encoding: 'utf-8' });
    const result = metadataTrackController.parseMetadataFromTSV(
      mockData, mockMetadataSampleNameToId,
    );
    expect(result).toMatchSnapshot();
  });
});
