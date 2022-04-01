// @ts-nocheck
const { aggregateIntoJsonObject, aggregateIntoJsonArray } = require('../../src/sql/helpers');

const { mockSqlClient } = require('../api.v2/mocks/getMockSqlClient')();

describe('aggregateIntoJsonObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Works correctly', async () => {
    const mockJsonbObjectAggResult = 'jsonbObjectAggResult';

    mockSqlClient.groupBy.mockImplementationOnce(() => Promise.resolve('finish'));
    mockSqlClient.raw.mockImplementationOnce(() => mockJsonbObjectAggResult);

    const result = await aggregateIntoJsonObject(
      'originalQuery',
      ['root_1', 'root_2'],
      ['nested_1', 'nested_2'],
      'aggregationColumnKey',
      'aggregationJsonKey',
      mockSqlClient,
    );

    expect(mockSqlClient.raw.mock.calls[0]).toMatchSnapshot();

    expect(mockSqlClient.select).toHaveBeenCalledWith(['root_1', 'root_2', mockJsonbObjectAggResult]);
    expect(mockSqlClient.from).toHaveBeenCalledWith('originalQuery');
    expect(mockSqlClient.groupBy).toHaveBeenCalledWith(['root_1', 'root_2']);

    expect(result).toEqual('finish');
  });
});

describe('aggregateIntoJsonArray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Works correctly', async () => {
    const mockArrayAggregate = 'arrayAggregateResult';

    mockSqlClient.groupBy.mockImplementationOnce(() => Promise.resolve('finish'));
    mockSqlClient.raw.mockImplementationOnce(() => mockArrayAggregate);

    const result = await aggregateIntoJsonArray(
      'originalQuery',
      ['root_1', 'root_2'],
      'field_key',
      'fieldJsonKey',
      mockSqlClient,
    );

    expect(mockSqlClient.raw.mock.calls[0]).toMatchSnapshot();

    expect(mockSqlClient.select).toHaveBeenCalledWith(['root_1', 'root_2', 'arrayAggregateResult']);
    expect(mockSqlClient.from).toHaveBeenCalledWith('originalQuery');
    expect(mockSqlClient.groupBy).toHaveBeenCalledWith(['root_1', 'root_2']);

    expect(result).toEqual('finish');
  });
});
