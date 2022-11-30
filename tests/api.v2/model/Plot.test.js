// @ts-nocheck
// Disabled ts because it doesn't recognize jest mocks
const _ = require('lodash');

const config = require('../../../src/config');

const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();
const getObject = require('../../../src/api.v2/helpers/s3/getObject');

jest.mock('../../../src/api.v2/helpers/s3/getObject');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const Plot = require('../../../src/api.v2/model/Plot');
const BasicModel = require('../../../src/api.v2/model/BasicModel');
const { NotFoundError } = require('../../../src/utils/responses');
const tableNames = require('../../../src/api.v2/model/tableNames');

const mockExperimentId = 'mockExperimentId';
const mockPlotUuid = 'mockPlotUuid';


describe('model/Plot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getConfig works correctly', async () => {
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
    expect(getObject).toHaveBeenCalledWith({ Bucket: `plots-tables-${config.clusterEnv}-${config.awsAccountId}`, Key: mockS3DataKey });

    expect(result).toEqual({ config: mockConfig, plotData: mockPlotData });
  });

  it('getConfig does not download plot data from S3 if plot does not have plot data', async () => {
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

  it('getConfig throws not found error if the plot was not found', async () => {
    jest.spyOn(BasicModel.prototype, 'findOne').mockImplementationOnce(() => Promise.resolve(null));

    await expect(
      new Plot().getConfig(mockExperimentId, mockPlotUuid),
    ).rejects.toThrow(
      new NotFoundError(`Plot ${mockPlotUuid} in experiment ${mockExperimentId} not found`),
    );

    expect(getObject).not.toHaveBeenCalled();
  });

  it('updateConfig works correctly', async () => {
    const mockConfig = {
      legend: { enabled: true },
      plotTitle: 'mockPlotTitle',
    };

    const mockUpsert = jest.spyOn(BasicModel.prototype, 'upsert');

    await new Plot().updateConfig(mockExperimentId, mockPlotUuid, mockConfig);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: mockPlotUuid, experiment_id: mockExperimentId },
      { config: mockConfig },
    );
  });

  it('invalidateAttributesForMatches works correctly', async () => {
    const experimentId = 'mockExperimentId';
    const plotIdMatcher = 'ViolinMain%';
    const invalidatedKeys = ['selectedPoints', 'selectedCellSet'];

    mockTrx.andWhereLike.mockImplementationOnce(() => Promise.resolve([
      {
        id: 'ViolinMain',
        config: {
          selectedPoints: [1, 2, 3],
          selectedCellSet: 'louvain',
          title: {
            dx: 0,
            text: 'Gzma',
            anchor: 'start',
            fontSize: 20,
          },
        },
      },
      {
        id: 'ViolinMain-0',
        config: {
          selectedPoints: [5, 1, 9],
          selectedCellSet: 'louvain',
          title: {
            dx: 0,
            text: 'Lyz2',
            anchor: 'start',
            fontSize: 20,
          },
        },
      },
      {
        id: 'ViolinMain-1',
        config: {
          selectedPoints: [7, 2, 8],
          selectedCellSet: 'louvain',
          title: {
            dx: 0,
            text: 'Lyz1',
            anchor: 'start',
            fontSize: 20,
          },
        },
      },
    ]));

    mockTrx.returning
      .mockReturnValueOnce(Promise.resolve([{
        id: 'ViolinMain',
        config: {
          title: {
            dx: 0,
            text: 'Gzma',
            anchor: 'start',
            fontSize: 20,
          },
        },
      }]))
      .mockReturnValueOnce(Promise.resolve([{
        id: 'ViolinMain-0',
        config: {
          title: {
            dx: 0,
            text: 'Lyz2',
            anchor: 'start',
            fontSize: 20,
          },
        },
      }]))
      .mockReturnValueOnce(Promise.resolve([{
        id: 'ViolinMain-1',
        config: {
          title: {
            dx: 0,
            text: 'Lyz1',
            anchor: 'start',
            fontSize: 20,
          },
        },
      }]));

    const invalidatedPlots = await new Plot().invalidateAttributesForMatches(
      experimentId, plotIdMatcher, invalidatedKeys,
    );

    expect(mockTrx).toHaveBeenCalledWith(tableNames.PLOT);

    expect(_.map(invalidatedPlots, 'id')).toEqual(['ViolinMain', 'ViolinMain-0', 'ViolinMain-1']);
    expect(_.map(invalidatedPlots, 'config')).toEqual([
      {
        title: {
          dx: 0,
          text: 'Gzma',
          anchor: 'start',
          fontSize: 20,
        },
      },
      {
        title: {
          dx: 0,
          text: 'Lyz2',
          anchor: 'start',
          fontSize: 20,
        },
      },
      {
        title: {
          dx: 0,
          text: 'Lyz1',
          anchor: 'start',
          fontSize: 20,
        },
      },
    ]);

    expect(mockTrx.select.mock.calls).toMatchSnapshot({}, 'select calls');
    expect(mockTrx.where.mock.calls).toMatchSnapshot({}, 'where calls');
    expect(mockTrx.andWhereLike.mock.calls).toMatchSnapshot({}, 'andWhereLike calls');
    expect(mockTrx.update.mock.calls).toMatchSnapshot({}, 'update calls');
    expect(mockTrx.returning.mock.calls).toMatchSnapshot({}, 'returning calls');
  });
});
