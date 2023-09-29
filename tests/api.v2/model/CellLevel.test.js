// @ts-nocheck
const { mockSqlClient } = require('../mocks/getMockSqlClient')();
const CellLevel = require('../../../src/api.v2/model/CellLevel');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

describe('model/CellLevel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getMetadataByExperimentId retrieves data correctly', async () => {
    const mockExperimentId = 'mockExperimentId';
    const mockResult = {
      id: 'mockId',
      name: 'mockName',
      upload_status: 'mockStatus',
      created_at: 'mockDate',
    };

    mockSqlClient.first.mockReturnValueOnce(Promise.resolve(mockResult));

    const cellLevel = new CellLevel();
    const result = await cellLevel.getMetadataByExperimentId(mockExperimentId);

    expect(result).toEqual(mockResult);


    expect(mockSqlClient.select.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.from.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.leftJoin.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.where.mock.calls).toMatchSnapshot();
  });
});
