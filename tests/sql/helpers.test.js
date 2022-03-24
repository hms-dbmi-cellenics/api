const { sqlToCamelCased, aggregateIntoJson } = require('../../src/sql/helpers');

describe('sqlToCamelCased', () => {
  it('Works correctly', () => {
    const experimentFields = [
      'id',
      'name',
      'description',
      'samples_order',
      'notify_by_email',
      'created_at',
      'updated_at',
    ];

    expect(sqlToCamelCased(experimentFields)).toEqual([
      'id as id',
      'name as name',
      'description as description',
      'samples_order as samplesOrder',
      'notify_by_email as notifyByEmail',
      'created_at as createdAt',
      'updated_at as updatedAt',
    ]);
  });
});

describe('aggregateIntoJson', () => {
  it('Works correctly', async () => {
    const mockGroupBy = jest.fn(() => Promise.resolve('finish'));
    const mockFrom = jest.fn(() => ({ groupBy: mockGroupBy }));
    const mockSelect = jest.fn(() => ({ from: mockFrom }));

    const mockJsonbObjectAggResult = 'jsonb_object_agg(etc, etc)';
    const mockSql = {
      raw: jest.fn(() => mockJsonbObjectAggResult),
      select: mockSelect,
    };

    const result = await aggregateIntoJson(
      'originalQuery',
      ['root_1', 'root_2'],
      ['nested_1', 'nested_2'],
      'aggregationColumnKey',
      'aggregationJsonKey',
      mockSql,
    );

    expect(mockSql.raw.mock.calls[0]).toMatchSnapshot();

    expect(mockSelect).toHaveBeenCalledWith(['root_1 as root1', 'root_2 as root2', mockJsonbObjectAggResult]);
    expect(mockFrom).toHaveBeenCalledWith('originalQuery');
    expect(mockGroupBy).toHaveBeenCalledWith(['root_1', 'root_2']);

    expect(result).toEqual('finish');
  });
});
