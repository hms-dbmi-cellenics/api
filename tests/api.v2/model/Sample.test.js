const { mockSqlClient } = require('../mocks/getMockSqlClient')();

const Sample = require('../../../src/api.v2/model/Sample');

const mockExperimentId = 'mockExperimentId';

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));


describe('Sample apiv2 model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Get samples works correctly', async () => {
    await new Sample().getSamples(mockExperimentId).toString();

    expect(mockSqlClient.where.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.from.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.select.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.join.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.groupBy.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.raw.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.leftJoin.mock.calls).toMatchSnapshot();
  });
});
