const generateBasicModelFunctions = require('../../../src/api.v2/helpers/generateBasicModelFunctions');

jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

const experiment = require('../../../src/api.v2/model/experiment');

describe('model/experiment', () => {
  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(generateBasicModelFunctions).toHaveBeenCalledTimes(1);
    expect(generateBasicModelFunctions).toHaveBeenCalledWith({
      tableName: 'experiment',
      selectableProps: [
        'id',
        'name',
        'description',
        'processing_config',
        'notify_by_email',
        'created_at',
        'updated_at',
      ],
    });

    expect(experiment).toEqual(
      expect.objectContaining({
        hasFakeBasicModelFunctions: true,
      }),
    );
  });
});
