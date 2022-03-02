const SQLClientLoader = require('../../src/loaders/SQLClient');

const knexfile = require('../../src/SQL/knexfile');
const SQLClient = require('../../src/SQL/SQLClient');

const config = require('../../src/config');

const mockClusterEnv = 'production';
const mockKnexConfig = { fake: true, connection: { host: 'fakeHost' } };


jest.mock('../../src/config');
jest.mock('../../src/SQLClient/knexfile', () => jest.fn(
  () => Promise.resolve({
    [mockClusterEnv]: mockKnexConfig,
  }),
));

jest.mock('../../src/SQLClient', () => ({
  get: jest.fn(),
}));

describe('SQLClientLoader', () => {
  it('Works correctly', async () => {
    config.clusterEnv = mockClusterEnv;

    await SQLClientLoader();

    // Loads the knexfile
    expect(knexfile).toHaveBeenCalledTimes(1);

    // Uses the knex config it gets on the SQLClient
    expect(SQLClient.get).toHaveBeenCalledWith(mockKnexConfig);
    expect(SQLClient.get).toHaveBeenCalledTimes(1);
  });
});
