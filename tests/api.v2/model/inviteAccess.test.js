const generateBasicModelFunctions = require('../../../src/api.v2/helpers/generateBasicModelFunctions');

jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

const inviteAccess = require('../../../src/api.v2/model/inviteAccess');

describe('model/inviteAccess', () => {
  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(generateBasicModelFunctions).toHaveBeenCalledTimes(1);
    expect(generateBasicModelFunctions).toHaveBeenCalledWith({
      tableName: 'user_access',
      selectableProps: [
        'user_email',
        'experiment_id',
        'access_role',
        'updated_at',
      ],
    });

    expect(inviteAccess).toEqual(
      expect.objectContaining({
        hasFakeBasicModelFunctions: true,
      }),
    );
  });
});
