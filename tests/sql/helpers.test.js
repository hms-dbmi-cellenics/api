// @ts-nocheck
const { collapseKeyIntoArray } = require('../../src/sql/helpers');

const { mockSqlClient } = require('../api.v2/mocks/getMockSqlClient')();

describe('collapseKeyIntoArray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Works correctly', async () => {
    const mockCollapsedArray = 'collapsedArrayResult';

    mockSqlClient.groupBy.mockImplementationOnce(() => Promise.resolve('finish'));
    mockSqlClient.raw.mockImplementationOnce(() => mockCollapsedArray);

    const result = await collapseKeyIntoArray(
      'originalQuery',
      ['root_1', 'root_2'],
      'field_key',
      'fieldJsonKey',
      mockSqlClient,
    );

    expect(mockSqlClient.raw.mock.calls[0]).toMatchSnapshot();

    expect(mockSqlClient.select).toHaveBeenCalledWith(['root_1', 'root_2', mockCollapsedArray]);
    expect(mockSqlClient.from).toHaveBeenCalledWith('originalQuery');
    expect(mockSqlClient.groupBy).toHaveBeenCalledWith(['root_1', 'root_2']);

    expect(result).toEqual('finish');
  });
});
