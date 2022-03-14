const generateBasicModelFunctions = require('../../../src/api.v2/helpers/generateBasicModelFunctions');

jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

const userAccess = require('../../../src/api.v2/model/userAccess');

describe('model/userAccess', () => {
  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(generateBasicModelFunctions).toHaveBeenCalledTimes(1);
    expect(generateBasicModelFunctions).toHaveBeenCalledWith({
      tableName: 'user_access',
      selectableProps: [
        'user_id',
        'experiment_id',
        'access_role',
        'updated_at',
      ],
    });

    expect(userAccess).toEqual(
      expect.objectContaining({
        hasFakeBasicModelFunctions: true,
      }),
    );
  });
});
