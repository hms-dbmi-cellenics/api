jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

const userAccess = require('../../../src/api.v2/model/userAccess');

describe('model/userAccess', () => {
  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(userAccess).toEqual(
      expect.objectContaining({
        hasFakeBasicModelFunctions: true,
      }),
    );
  });
});
