const config = require('../../src/config');
const getConnectionParams = require('../../src/SQL/getConnectionParams');

const knexfile = require('../../src/SQL/knexfile');

jest.mock('../../src/config');

const mockConnectionParams = { fake: true };
jest.mock('../../src/SQL/getConnectionParams', () => jest.fn(() => mockConnectionParams));

describe('knexfile', () => {
  it('Works correctly for staging', async () => {
    config.clusterEnv = 'staging';

    const res = await knexfile();

    expect(getConnectionParams).toHaveBeenCalled();

    // @ts-ignore
    expect(res.staging).toBeTruthy();

    // @ts-ignore
    expect(res.staging.connection).toEqual(mockConnectionParams);

    expect(res).toMatchSnapshot();
  });
});
