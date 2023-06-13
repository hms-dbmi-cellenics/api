// @ts-nocheck
const { mockSqlClient } = require('../mocks/getMockSqlClient')();

const experimentExecutionGem2sRow = require('../mocks/data/experimentExecutionGem2sRow.json');
const experimentExecutionQCRow = require('../mocks/data/experimentExecutionQCRow.json');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const ExperimentExecution = require('../../../src/api.v2/model/ExperimentExecution');

describe('ExperimentExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copyTo works correctly', async () => {
    const fromExperimentId = 'mockFromExperimentId';
    const toExperimentId = 'mockToExperimentId';
    const sampleIdsMap = { fromSample1: 'toSample1', fromSample2: 'toSample2' };

    mockSqlClient.where.mockImplementationOnce(() => Promise.resolve([
      experimentExecutionGem2sRow,
      experimentExecutionQCRow,
    ]));

    await new ExperimentExecution().copyTo(fromExperimentId, toExperimentId, sampleIdsMap);

    expect(mockSqlClient.queryContext).toHaveBeenCalledWith({ camelCaseExceptions: ['metadata'] });
    expect(mockSqlClient.select.mock.calls).toMatchSnapshot('select calls');
    expect(mockSqlClient.where.mock.calls).toMatchSnapshot('where calls');
    expect(mockSqlClient.insert.mock.calls).toMatchSnapshot('insert calls');
  });
});
