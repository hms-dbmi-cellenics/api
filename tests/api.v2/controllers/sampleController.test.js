// @ts-nocheck
const Experiment = require('../../../src/api.v2/model/Experiment');
const Sample = require('../../../src/api.v2/model/Sample');
const MetadataTrack = require('../../../src/api.v2/model/MetadataTrack');

const experimentInstance = Experiment();
const sampleInstance = Sample();
const metadataTrackInstance = MetadataTrack();
const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api.v2/model/Experiment');
jest.mock('../../../src/api.v2/model/Sample');
jest.mock('../../../src/api.v2/model/MetadataTrack');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const sampleController = require('../../../src/api.v2/controllers/sampleController');

const mockRes = {
  json: jest.fn(),
};

const mockExperimentId = 'mockExperimentId';
const mockSampleId = 'mockSampleId';
const mockSampleTechnology = '10x';
const mockSampleName = 'mockSampleName';

describe('sampleController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('createSample works correctly', async () => {
    const mockReq = {
      params: { experimentId: mockExperimentId, sampleId: mockSampleId },
      body: { name: mockSampleName, sampleTechnology: mockSampleTechnology },
    };

    sampleInstance.create.mockImplementationOnce(() => Promise.resolve());
    experimentInstance.addSample.mockImplementationOnce(() => Promise.resolve());
    metadataTrackInstance.createNewSampleValues.mockImplementationOnce(() => Promise.resolve());

    await sampleController.createSample(mockReq, mockRes);

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    // Used with transactions
    expect(Sample).toHaveBeenCalledWith(mockTrx);
    expect(Experiment).toHaveBeenCalledWith(mockTrx);
    expect(MetadataTrack).toHaveBeenCalledWith(mockTrx);

    // Not used without transactions
    expect(Sample).not.toHaveBeenCalledWith(mockSqlClient);
    expect(Experiment).not.toHaveBeenCalledWith(mockSqlClient);
    expect(MetadataTrack).not.toHaveBeenCalledWith(mockSqlClient);

    expect(sampleInstance.create).toHaveBeenCalledWith(
      {
        experiment_id: mockExperimentId,
        id: mockSampleId,
        name: mockSampleName,
        sample_technology: mockSampleTechnology,
      },
    );
    expect(experimentInstance.addSample).toHaveBeenCalledWith(mockExperimentId, mockSampleId);
    expect(metadataTrackInstance.createNewSampleValues)
      .toHaveBeenCalledWith(mockExperimentId, mockSampleId);

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('createSample errors out if the transaction fails', async () => {
    const mockReq = {
      params: { experimentId: mockExperimentId, sampleId: mockSampleId },
      body: { name: mockSampleName, sampleTechnology: mockSampleTechnology },
    };

    mockSqlClient.transaction.mockImplementationOnce(() => Promise.reject(new Error()));

    await expect(sampleController.createSample(mockReq, mockRes)).rejects.toThrow();

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('deleteSample works correctly', async () => {
    const mockReq = { params: { experimentId: mockExperimentId, sampleId: mockSampleId } };

    sampleInstance.destroy.mockImplementationOnce(() => Promise.resolve());
    experimentInstance.deleteSample.mockImplementationOnce(() => Promise.resolve());

    await sampleController.deleteSample(mockReq, mockRes);

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    // Used with transactions
    expect(Experiment).toHaveBeenCalledWith(mockTrx);
    expect(Sample).toHaveBeenCalledWith(mockTrx);

    // Not used without transactions
    expect(Experiment).not.toHaveBeenCalledWith(mockSqlClient);
    expect(Sample).not.toHaveBeenCalledWith(mockSqlClient);

    expect(sampleInstance.destroy).toHaveBeenCalledWith(mockSampleId);
    expect(experimentInstance.deleteSample).toHaveBeenCalledWith(mockExperimentId, mockSampleId);

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('deleteSample errors out if the transaction fails', async () => {
    const mockReq = { params: { experimentId: mockExperimentId, sampleId: mockSampleId } };

    mockSqlClient.transaction.mockImplementationOnce(() => Promise.reject(new Error()));

    await expect(sampleController.deleteSample(mockReq, mockRes)).rejects.toThrow();

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('patchSample works correctly', async () => {
    const mockSampleNewName = 'theNewName';
    const mockReq = {
      params: { experimentId: mockExperimentId, sampleId: mockSampleId },
      body: { name: mockSampleNewName },
    };

    sampleInstance.updateById.mockImplementationOnce(() => Promise.resolve());

    await sampleController.patchSample(mockReq, mockRes);

    expect(sampleInstance.updateById).toHaveBeenCalledWith(
      mockSampleId, { name: mockSampleNewName },
    );

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });
});
