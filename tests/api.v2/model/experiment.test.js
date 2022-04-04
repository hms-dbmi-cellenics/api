// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const sqlClient = require('../../../src/sql/sqlClient');
const helpers = require('../../../src/sql/helpers');

const validSamplesOrderResult = ['sampleId1', 'sampleId2', 'sampleId3', 'sampleId4'];

const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/helpers/generateBasicModelFunctions',
  () => jest.fn(() => ({ hasFakeBasicModelFunctions: true })));

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

jest.mock('../../../src/sql/helpers', () => ({
  collapseKeysIntoObject: jest.fn(),
  collapseKeyIntoArray: jest.fn(),
}));

const experiment = require('../../../src/api.v2/model/experiment');

const mockExperimentId = 'mockExperimentId';

describe('model/experiment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Returns the correct generateBasicModelFunctions', async () => {
    expect(experiment).toEqual(
      expect.objectContaining({
        hasFakeBasicModelFunctions: true,
      }),
    );
  });

  it('getAllExperiments works correctly', async () => {
    const queryResult = 'result';
    helpers.collapseKeyIntoArray.mockReturnValueOnce(
      Promise.resolve(queryResult),
    );

    const expectedResult = await experiment.getAllExperiments('mockUserId');

    expect(queryResult).toEqual(expectedResult);

    expect(sqlClient.get).toHaveBeenCalled();
    expect(helpers.collapseKeyIntoArray).toHaveBeenCalledWith(
      expect.any(Function),
      ['id', 'name', 'description', 'samples_order', 'notify_by_email', 'created_at', 'updated_at'],
      'key',
      'metadataKeys',
      mockSqlClient,
    );


    // Check that mainQuery is correct
    const mainQuery = helpers.collapseKeyIntoArray.mock.calls[0][0];

    jest.clearAllMocks();
    await mainQuery.bind(mockSqlClient)();

    expect(mockSqlClient.select).toHaveBeenCalledWith(
      ['e.id', 'e.name', 'e.description', 'e.samples_order', 'e.notify_by_email', 'e.created_at', 'e.updated_at', 'm.key'],
    );
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith('user_id', 'mockUserId');
    expect(mockSqlClient.join).toHaveBeenCalledWith('experiment as e', 'e.id', 'user_access.experiment_id');
    expect(mockSqlClient.leftJoin).toHaveBeenCalledWith('metadata_track as m', 'e.id', 'm.experiment_id');
    expect(mockSqlClient.as).toHaveBeenCalledWith('mainQuery');
  });

  it('getExperimentData works correctly', async () => {
    const queryResult = 'result';
    helpers.collapseKeysIntoObject.mockReturnValueOnce(mockSqlClient);
    mockSqlClient.first.mockReturnValueOnce(queryResult);

    const expectedResult = await experiment.getExperimentData(mockExperimentId);

    expect(expectedResult).toEqual(queryResult);

    expect(sqlClient.get).toHaveBeenCalled();
    expect(helpers.collapseKeysIntoObject).toHaveBeenCalledWith(
      expect.any(Function),
      ['id', 'name', 'description', 'samples_order', 'notify_by_email', 'processing_config', 'created_at', 'updated_at'],
      ['params_hash', 'state_machine_arn', 'execution_arn'],
      'pipeline_type',
      'pipelines',
      mockSqlClient,
    );


    // Check that mainQuery is correct
    const mainQuery = helpers.collapseKeysIntoObject.mock.calls[0][0];

    jest.clearAllMocks();
    await mainQuery.bind(mockSqlClient)();

    expect(mockSqlClient.select).toHaveBeenCalledWith('*');
    expect(mockSqlClient.from).toHaveBeenCalledWith('experiment');
    expect(mockSqlClient.leftJoin).toHaveBeenCalledWith('experiment_execution', 'experiment.id', 'experiment_execution.experiment_id');
    expect(mockSqlClient.where).toHaveBeenCalledWith('id', 'mockExperimentId');
    expect(mockSqlClient.as).toHaveBeenCalledWith('mainQuery');
  });

  it('getExperimentData throws if an empty object is returned (the experiment was not found)', async () => {
    helpers.collapseKeysIntoObject.mockReturnValueOnce(mockSqlClient);
    mockSqlClient.first.mockReturnValueOnce({});

    await expect(experiment.getExperimentData(mockExperimentId)).rejects.toThrow(new Error('Experiment not found'));
  });

  it('updateSamplePosition works correctly if valid params are passed', async () => {
    mockTrx.returning.mockImplementationOnce(
      () => Promise.resolve([{ samplesOrder: validSamplesOrderResult }]),
    );
    mockTrx.raw.mockImplementationOnce(() => 'resultOfSql.raw');

    await experiment.updateSamplePosition(mockExperimentId, 0, 1);

    expect(mockTrx).toHaveBeenCalledWith('experiment');

    expect(mockTrx.update).toHaveBeenCalledWith({ samples_order: 'resultOfSql.raw' });
    expect(mockTrx.raw.mock.calls[0]).toMatchSnapshot();
    expect(mockTrx.where).toHaveBeenCalledWith('id', 'mockExperimentId');
    expect(mockTrx.returning).toHaveBeenCalledWith(['samples_order']);

    expect(mockTrx.commit).toHaveBeenCalled();
    expect(mockTrx.rollback).not.toHaveBeenCalled();
  });

  it('updateSamplePosition rolls back if the result is invalid', async () => {
    mockTrx.returning.mockImplementationOnce(() => Promise.resolve([{ samplesOrder: null }]));
    mockTrx.raw.mockImplementationOnce(() => 'resultOfSql.raw');

    await expect(experiment.updateSamplePosition(mockExperimentId, 0, 1)).rejects.toThrow('Invalid update parameters');

    expect(mockTrx).toHaveBeenCalledWith('experiment');

    expect(mockTrx.update).toHaveBeenCalledWith({ samples_order: 'resultOfSql.raw' });
    expect(mockTrx.raw.mock.calls[0]).toMatchSnapshot();
    expect(mockTrx.where).toHaveBeenCalledWith('id', 'mockExperimentId');
    expect(mockTrx.returning).toHaveBeenCalledWith(['samples_order']);

    expect(mockTrx.commit).not.toHaveBeenCalled();
    expect(mockTrx.rollback).toHaveBeenCalled();
  });

  it('updateSamplePosition rolls back if the parameters are invalid', async () => {
    mockTrx.returning.mockImplementationOnce(
      () => Promise.resolve([{ samplesOrder: validSamplesOrderResult }]),
    );
    mockTrx.raw.mockImplementationOnce(() => 'resultOfSql.raw');

    await expect(experiment.updateSamplePosition(mockExperimentId, 0, 10000)).rejects.toThrow('Invalid update parameters');

    expect(mockTrx).toHaveBeenCalledWith('experiment');

    expect(mockTrx.update).toHaveBeenCalledWith({ samples_order: 'resultOfSql.raw' });
    expect(mockTrx.raw.mock.calls[0]).toMatchSnapshot();
    expect(mockTrx.where).toHaveBeenCalledWith('id', 'mockExperimentId');
    expect(mockTrx.returning).toHaveBeenCalledWith(['samples_order']);

    expect(mockTrx.commit).not.toHaveBeenCalled();
    expect(mockTrx.rollback).toHaveBeenCalled();
  });
});
