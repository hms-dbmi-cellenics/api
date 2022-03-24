// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const sqlClient = require('../../../src/sql/sqlClient');
const helpers = require('../../../src/sql/helpers');
const generateBasicModelFunctions = require('../../../src/api.v2/helpers/generateBasicModelFunctions');

const mockSqlClient = { isMockSqlClient: true };
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

jest.mock('../../../src/sql/helpers', () => ({
  aggregateIntoJson: jest.fn(),
}));

jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

const experiment = require('../../../src/api.v2/model/experiment');

const mockExperimentId = 'mockExperimentId';

describe('model/experiment', () => {
  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(generateBasicModelFunctions).toHaveBeenCalledTimes(1);
    expect(generateBasicModelFunctions).toHaveBeenCalledWith({
      tableName: 'experiment',
      selectableProps: [
        'id',
        'name',
        'description',
        'samples_order',
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

  it('Works correctly', async () => {
    const mockAggregateIntoJsonResult = ['result'];
    helpers.aggregateIntoJson.mockReturnValueOnce(mockAggregateIntoJsonResult);

    const result = await experiment.getExperimentData(mockExperimentId);

    expect(result).toEqual(mockAggregateIntoJsonResult[0]);

    expect(sqlClient.get).toHaveBeenCalled();
    expect(helpers.aggregateIntoJson).toHaveBeenCalledWith(
      expect.anything(),
      ['id', 'name', 'description', 'samples_order', 'notify_by_email', 'created_at', 'updated_at'],
      ['params_hash', 'state_machine_arn', 'execution_arn'],
      'pipeline_type',
      'pipelines',
      { isMockSqlClient: true },
    );

    const firstParam = helpers.aggregateIntoJson.mock.calls[0][0];

    // Checking query (a function, the first param that was passed to helpers.aggregateIntoJson)
    expect(firstParam.toString()).toMatchSnapshot();
  });
});
