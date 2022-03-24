jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const userAccess = require('../../../src/api.v2/model/userAccess');

describe('model/userAccess', () => {
  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(userAccess).toEqual(
      expect.objectContaining({
        hasFakeBasicModelFunctions: true,
      }),
    );
  });

  it('canAccessExperiment works correctly', async () => {

  });
});
