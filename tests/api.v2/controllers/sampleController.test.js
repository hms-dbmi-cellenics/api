// @ts-nocheck
const experimentModel = require('../../../src/api.v2/model/Experiment')();
const sampleModel = require('../../../src/api.v2/model/Sample')();
const metadataTrackModel = require('../../../src/api.v2/model/MetadataTrack')();
const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/model/Experiment');
jest.mock('../../../src/api.v2/model/Sample');
jest.mock('../../../src/api.v2/model/MetadataTrack');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const sampleController = require('../../../src/api.v2/controllers/sampleController');
const { OK } = require('../../../src/utils/responses');

// const mockReqCreateExperiment = {
//   params: {
//     experimentId: mockExperiment.id,
//   },
//   user: {
//     sub: 'mockSub',
//   },
//   body: {
//     name: 'mockName',
//     description: 'mockDescription',
//   },
// };

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

    sampleModel.create.mockImplementationOnce(() => Promise.resolve());
    experimentModel.addSample.mockImplementationOnce(() => Promise.resolve());
    metadataTrackModel.createNewSampleValues.mockImplementationOnce(() => Promise.resolve());

    await sampleController.createSample(mockReq, mockRes);

    expect(sampleModel.create).toHaveBeenCalledWith(
      {
        experiment_id: mockExperimentId,
        id: mockSampleId,
        name: mockSampleName,
        sample_technology: mockSampleTechnology,
      },
    );
    expect(experimentModel.addSample).toHaveBeenCalledWith(mockExperimentId, mockSampleId);
    expect(metadataTrackModel.createNewSampleValues)
      .toHaveBeenCalledWith(mockExperimentId, mockSampleId);

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });
});
