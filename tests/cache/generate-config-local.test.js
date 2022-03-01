/* eslint-disable consistent-return */
const { BASE_CONFIG, generateConfig } = require('../../src/cache/generateConfig');

describe('generateConfig (cache, local)', () => {
  it('Returns the default configuration in development and testing', async () => {
    const conf = await generateConfig();
    expect(conf).toEqual(BASE_CONFIG);
  });
});
