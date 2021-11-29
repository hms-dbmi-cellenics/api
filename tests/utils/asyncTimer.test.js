const asyncTimer = require('../../src/utils/asyncTimer');

describe('asyncTimer', () => {
  it('Resolves when time is up', async () => {
    const timeoutTime = 100;

    await expect(asyncTimer(timeoutTime)).resolves.toEqual('OK');
  });
});
