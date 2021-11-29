const timeout = require('../../src/utils/timeout');

describe('timeout', () => {
  it('Throws an Error when time is up', async () => {
    const timeoutTime = 100;
    const timeoutMessage = `Timeout reached: ${timeoutTime} ms`;

    await expect(timeout(timeoutTime)).rejects.toThrow(new Error(timeoutMessage));
  });
});
