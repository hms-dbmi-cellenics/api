// @ts-nocheck
// const { v4: uuidv4 } = require('uuid');

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

const mockUuid = jest.fn();
jest.mock('uuid', () => ({ v4: mockUuid }));

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const sampleController = require('../../../src/api.v2/controllers/sampleController');

const mockRes = {
  json: jest.fn(),
};

const mockExperimentId = 'mockExperimentId';
const mockSampleTechnology = '10x';

const newSamplesReq = [
  { name: 'mockSampleName1', sampleTechnology: mockSampleTechnology, options: {} },
  { name: 'mockSampleName2', sampleTechnology: mockSampleTechnology, options: {} },
];

const newSamplesCreated = [
  {
    id: 'uuid1', experiment_id: mockExperimentId, name: 'mockSampleName1', sample_technology: mockSampleTechnology, options: {},
  },
  {
    id: 'uuid2', experiment_id: mockExperimentId, name: 'mockSampleName2', sample_technology: mockSampleTechnology, options: {},
  },
];

describe('sampleController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it.only('createSample works correctly', async () => {
    const mockReq = {
      params: { experimentId: mockExperimentId },
      body: newSamplesReq, // { name: mockSampleName, sampleTechnology: mockSampleTechnology },
    };

    mockUuid.mockImplementationOnce(() => 'uuid1').mockImplementationOnce(() => 'uuid2');

    sampleInstance.create.mockImplementationOnce(() => Promise.resolve(newSamplesCreated));
    experimentInstance.addSamples.mockImplementationOnce(() => Promise.resolve());
    metadataTrackInstance.createNewSamplesValues.mockImplementationOnce(() => Promise.resolve());

    await sampleController.createSamples(mockReq, mockRes);

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    // Used with transactions
    expect(Sample).toHaveBeenCalledWith(mockTrx);
    expect(Experiment).toHaveBeenCalledWith(mockTrx);
    expect(MetadataTrack).toHaveBeenCalledWith(mockTrx);

    // Not used without transactions
    expect(Sample).not.toHaveBeenCalledWith(mockSqlClient);
    expect(Experiment).not.toHaveBeenCalledWith(mockSqlClient);
    expect(MetadataTrack).not.toHaveBeenCalledWith(mockSqlClient);

    expect(sampleInstance.create).toHaveBeenCalledWith(newSamplesCreated);
    expect(experimentInstance.addSamples).toHaveBeenCalledWith(mockExperimentId, ['uuid1', 'uuid2']);
    expect(metadataTrackInstance.createNewSamplesValues).toHaveBeenCalledWith(mockExperimentId, ['uuid1', 'uuid2']);

    expect(mockRes.json).toHaveBeenCalledWith({
      mockSampleName1: 'uuid1',
      mockSampleName2: 'uuid2',
    });
  });

  it('createSample errors out if the transaction fails', async () => {
    const mockReq = {
      params: { experimentId: mockExperimentId },
      body: { name: mockSampleName, sampleTechnology: mockSampleTechnology },
    };

    mockSqlClient.transaction.mockImplementationOnce(() => Promise.reject(new Error()));

    await expect(sampleController.createSamples(mockReq, mockRes)).rejects.toThrow();

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('deleteSample works correctly', async () => {
    const mockReq = { params: { experimentId: mockExperimentId, sampleId: mockSampleId } };

    sampleInstance.deleteById.mockImplementationOnce(() => Promise.resolve());
    experimentInstance.deleteSample.mockImplementationOnce(() => Promise.resolve());

    await sampleController.deleteSample(mockReq, mockRes);

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    // Used with transactions
    expect(Experiment).toHaveBeenCalledWith(mockTrx);
    expect(Sample).toHaveBeenCalledWith(mockTrx);

    // Not used without transactions
    expect(Experiment).not.toHaveBeenCalledWith(mockSqlClient);
    expect(Sample).not.toHaveBeenCalledWith(mockSqlClient);

    expect(sampleInstance.deleteById).toHaveBeenCalledWith(mockSampleId);
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

  it('updateSamplesOptions works correctly', async () => {
    const mockReq = {
      params: {
        experimentId: mockExperimentId,
      },
      body: { someOption: true, otherOption: false },
    };

    sampleInstance.updateOption.mockImplementationOnce(() => Promise.resolve());

    await sampleController.updateSamplesOptions(mockReq, mockRes);

    expect(sampleInstance.updateOption).toHaveBeenCalledWith(mockExperimentId, mockReq.body);
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('Get samples works correctly', async () => {
    const mockReq = { params: { experimentId: mockExperimentId } };
    sampleInstance.getSamples.mockImplementationOnce(() => Promise.resolve());
    await sampleController.getSamples(mockReq, mockRes);
    expect(sampleInstance.getSamples).toHaveBeenCalledWith(mockExperimentId);
  });
});
