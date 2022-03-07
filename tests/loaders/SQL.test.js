const sqlClientLoader = require('../../src/loaders/sqlClient');

const knexfile = require('../../src/sql/knexfile');
const sqlClient = require('../../src/sql/sqlClient');

const config = require('../../src/config');

const mockClusterEnv = 'production';
const mockKnexConfig = { fake: true, connection: { host: 'fakeHost' } };


jest.mock('../../src/config');
jest.mock('../../src/sql/knexfile', () => jest.fn(
  () => Promise.resolve({
    [mockClusterEnv]: mockKnexConfig,
  }),
));

jest.mock('../../src/sql/sqlClient', () => ({
  get: jest.fn(),
}));

describe('sqlClientLoader', () => {
  it('Works correctly', async () => {
    config.clusterEnv = mockClusterEnv;

    await sqlClientLoader();

    // Loads the knexfile
    expect(knexfile).toHaveBeenCalledTimes(1);

    // Uses the knex config it gets on the sqlClient
    expect(sqlClient.get).toHaveBeenCalledWith(mockKnexConfig);
    expect(sqlClient.get).toHaveBeenCalledTimes(1);
  });
});
