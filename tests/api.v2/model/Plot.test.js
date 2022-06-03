// @ts-nocheck
// Disabled ts because it doesn't recognize jest mocks
const config = require('../../../src/config');

const { mockSqlClient } = require('../mocks/getMockSqlClient')();
const getObject = require('../../../src/api.v2/helpers/s3/getObject');

jest.mock('../../../src/api.v2/helpers/s3/getObject');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const Plot = require('../../../src/api.v2/model/Plot');
const BasicModel = require('../../../src/api.v2/model/BasicModel');

const mockExperimentId = 'mockExperimentId';
const mockPlotUuid = 'mockPlotUuid';


describe('model/Plot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Get plot config works correctly', async () => {
    const mockConfig = { some: 'config' };
    const mockS3DataKey = 'mock/plot/data/key';
    const mockPlotData = [1, 2, 3];

    const mockFindOne = jest.spyOn(BasicModel.prototype, 'findOne')
      .mockImplementationOnce(() => ({
        s3DataKey: mockS3DataKey,
        config: mockConfig,
      }));

    getObject.mockImplementation(() => (JSON.stringify({
      plotData: mockPlotData,
    })));

    const result = await new Plot().getConfig(mockExperimentId, mockPlotUuid);

    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(mockFindOne).toHaveBeenCalledWith({ id: mockPlotUuid, experiment_id: mockExperimentId });

    expect(getObject).toHaveBeenCalledTimes(1);
    expect(getObject).toHaveBeenCalledWith({ Bucket: `plots-tables-${config.clusterEnv}`, Key: mockS3DataKey });

    expect(result).toEqual({ config: mockConfig, plotData: mockPlotData });
  });

  it('Does not download plot data from S3 if plot does not have plot data', async () => {
    const mockConfig = { some: 'config' };

    const mockFindOne = jest.spyOn(BasicModel.prototype, 'findOne')
      .mockImplementationOnce(() => ({
        s3DataKey: null,
        config: mockConfig,
      }));


    const result = await new Plot().getConfig(mockExperimentId, mockPlotUuid);

    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(mockFindOne).toHaveBeenCalledWith({ id: mockPlotUuid, experiment_id: mockExperimentId });

    expect(getObject).not.toHaveBeenCalled();

    expect(result).toEqual({ config: mockConfig });
  });

  it('Update plot config works correctly', async () => {
    const mockConfig = {
      legend: { enabled: true },
      plotTitle: 'mockPlotTitle',
    };

    const mockUpdate = jest.spyOn(BasicModel.prototype, 'update');

    await new Plot().updateConfig(mockExperimentId, mockPlotUuid, mockConfig);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ id: mockPlotUuid, experiment_id: mockExperimentId }, { config: mockConfig });
  });
});
