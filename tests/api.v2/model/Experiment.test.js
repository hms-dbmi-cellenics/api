// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const sqlClient = require('../../../src/sql/sqlClient');
const helpers = require('../../../src/sql/helpers');

const validSamplesOrderResult = ['sampleId1', 'sampleId2', 'sampleId3', 'sampleId4'];
const getProcessingConfigResponse = require('../mocks/data/getProcessingConfigResponse.json');
const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();
const BasicModel = require('../../../src/api.v2/model/BasicModel');
const { mockS3GetSignedUrl } = require('../../test-utils/mockAWSServices');
const config = require('../../../src/config');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mockNewExperimentId'),
}));

jest.mock('../../../src/sql/helpers', () => ({
  collapseKeysIntoObject: jest.fn(),
  collapseKeyIntoArray: jest.fn(),
  replaceNullsWithObject: () => (`COALESCE(
      jsonb_object_agg(pipeline_type, jsonb_build_object('state_machine_arn', state_machine_arn, 'execution_arn', execution_arn))
      FILTER(
        WHERE pipeline_type IS NOT NULL
      ),
      '{}'::jsonb
    ) as pipelines,}),`),
}));

const Experiment = require('../../../src/api.v2/model/Experiment');
const constants = require('../../../src/utils/constants');
const tableNames = require('../../../src/api.v2/model/tableNames');

const mockExperimentId = 'mockExperimentId';
const mockSampleId = 'mockSampleId';
const mockExperimentName = 'mockNewName';

describe('model/Experiment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllExperiments works correctly', async () => {
    const queryResult = 'result';
    helpers.collapseKeyIntoArray.mockReturnValueOnce(
      Promise.resolve(queryResult),
    );

    const expectedResult = await new Experiment().getAllExperiments('mockUserId');

    expect(queryResult).toEqual(expectedResult);

    expect(sqlClient.get).toHaveBeenCalled();
    expect(helpers.collapseKeyIntoArray.mock.calls).toMatchSnapshot();

    expect(mockSqlClient.select).toHaveBeenCalledWith(
      [
        'e.id',
        'e.name',
        'e.description',
        'e.samples_order',
        'e.notify_by_email',
        'e.pipeline_version',
        'e.created_at',
        'e.updated_at',
        'm.key',
        'p.parent_experiment_id',
        mockSqlClient.raw('CASE WHEN p.experiment_id IS NOT NULL THEN true ELSE false END as is_subsetted'),
      ],
    );
    expect(mockSqlClient.from).toHaveBeenCalledWith('user_access');
    expect(mockSqlClient.where).toHaveBeenCalledWith('user_id', 'mockUserId');
    expect(mockSqlClient.join).toHaveBeenCalledWith('experiment as e', 'e.id', 'user_access.experiment_id');
    expect(mockSqlClient.leftJoin).toHaveBeenCalledWith('metadata_track as m', 'e.id', 'm.experiment_id');
    expect(mockSqlClient.as).toHaveBeenCalledWith('mainQuery');
  });

  it('getExampleExperiments works correctly', async () => {
    const queryResult = 'result';

    mockSqlClient.groupBy.mockReturnValueOnce(queryResult);

    const expectedResult = await new Experiment().getExampleExperiments();

    expect(queryResult).toEqual(expectedResult);

    expect(sqlClient.get).toHaveBeenCalled();
    expect(mockSqlClient.select).toHaveBeenCalledWith(
      [
        'e.id',
        'e.name',
        'e.description',
        'e.publication_title',
        'e.publication_url',
        'e.data_source_title',
        'e.data_source_url',
        'e.species',
        'e.cell_count',
      ],
    );
    expect(mockSqlClient.min).toHaveBeenCalledWith('s.sample_technology as sample_technology');
    expect(mockSqlClient.count).toHaveBeenCalledWith('s.id as sample_count');
    expect(mockSqlClient.from).toHaveBeenCalledWith(tableNames.USER_ACCESS);
    expect(mockSqlClient.join).toHaveBeenCalledWith(`${tableNames.EXPERIMENT} as e`, 'e.id', `${tableNames.USER_ACCESS}.experiment_id`);
    expect(mockSqlClient.join).toHaveBeenCalledWith(`${tableNames.SAMPLE} as s`, 'e.id', 's.experiment_id');
    expect(mockSqlClient.where).toHaveBeenCalledWith('user_id', constants.PUBLIC_ACCESS_ID);
    expect(mockSqlClient.groupBy).toHaveBeenCalledWith('e.id');
  });

  it('getExperimentData works correctly', async () => {
    const experimentFields = [
      'id', 'name', 'description',
      'samples_order', 'processing_config',
      'notify_by_email', 'pipeline_version',
      'created_at', 'updated_at',
    ];

    const queryResult = 'result';
    helpers.collapseKeysIntoObject.mockReturnValueOnce(mockSqlClient);
    mockSqlClient.first.mockReturnValueOnce(queryResult);

    const mockCollapsedObject = 'collapsedObject';
    mockSqlClient.raw.mockImplementationOnce(() => mockCollapsedObject);

    const expectedResult = await new Experiment().getExperimentData(mockExperimentId);

    expect(expectedResult).toEqual(queryResult);

    expect(sqlClient.get).toHaveBeenCalled();

    expect(mockSqlClient.raw.mock.calls[0]).toMatchSnapshot();

    expect(mockSqlClient.select).toHaveBeenCalledWith([...experimentFields, 'parent_experiment_id', mockCollapsedObject]);
    expect(mockSqlClient.groupBy).toHaveBeenCalledWith([...experimentFields, 'parent_experiment_id']);
    expect(mockSqlClient.from).toHaveBeenCalled();

    // Check that mainQuery is correct
    const mainQuery = mockSqlClient.from.mock.calls[0][0];

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

    await expect(new Experiment().getExperimentData(mockExperimentId)).rejects.toThrow(new Error('Experiment not found'));
  });

  it('createCopy works correctly', async () => {
    mockSqlClient.raw.mockImplementation((template, values) => {
      if (values && values.length) return template.replace('?', values[0]);
      return template;
    });

    mockSqlClient.where.mockImplementationOnce(() => 'mockQuery');

    const expectedResult = await new Experiment().createCopy(mockExperimentId, mockExperimentName);

    expect(expectedResult).toEqual('mockNewExperimentId');

    expect(sqlClient.get).toHaveBeenCalled();

    expect(mockSqlClient.insert).toHaveBeenCalledWith('mockQuery');

    expect(mockSqlClient.select).toHaveBeenCalledWith([
      'mockNewExperimentId as id',
      'mockNewName as name',
      'description',
      'pod_cpus',
      'pod_memory',
    ]);

    expect(mockSqlClient.where).toHaveBeenCalledWith({ id: mockExperimentId });
    expect(mockSqlClient.into).toHaveBeenCalledWith('experiment (id, name, description, pod_cpus, pod_memory)');
  });

  it('createCopy works correctly without a name', async () => {
    mockSqlClient.raw.mockImplementation((template, values) => {
      if (values && values.length) return template.replace('?', values[0]);
      return template;
    });

    mockSqlClient.where.mockImplementationOnce(() => 'mockQuery');

    const expectedResult = await new Experiment().createCopy(mockExperimentId);

    expect(expectedResult).toEqual('mockNewExperimentId');

    expect(sqlClient.get).toHaveBeenCalled();

    expect(mockSqlClient.insert).toHaveBeenCalledWith('mockQuery');

    expect(mockSqlClient.select).toHaveBeenCalledWith([
      'mockNewExperimentId as id',
      'name',
      'description',
      'pod_cpus',
      'pod_memory',
    ]);

    expect(mockSqlClient.where).toHaveBeenCalledWith({ id: mockExperimentId });
    expect(mockSqlClient.into).toHaveBeenCalledWith('experiment (id, name, description, pod_cpus, pod_memory)');
  });

  it('updateSamplePosition works correctly if valid params are passed', async () => {
    mockTrx.returning.mockImplementationOnce(
      () => Promise.resolve([{ samplesOrder: validSamplesOrderResult }]),
    );
    mockTrx.raw.mockImplementationOnce(() => 'resultOfSql.raw');

    await new Experiment().updateSamplePosition(mockExperimentId, 0, 1);

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

    await expect(new Experiment().updateSamplePosition(mockExperimentId, 0, 1)).rejects.toThrow('Invalid update parameters');

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

    await expect(new Experiment().updateSamplePosition(mockExperimentId, 0, 10000)).rejects.toThrow('Invalid update parameters');

    expect(mockTrx).toHaveBeenCalledWith('experiment');

    expect(mockTrx.update).toHaveBeenCalledWith({ samples_order: 'resultOfSql.raw' });
    expect(mockTrx.raw.mock.calls[0]).toMatchSnapshot();
    expect(mockTrx.where).toHaveBeenCalledWith('id', 'mockExperimentId');
    expect(mockTrx.returning).toHaveBeenCalledWith(['samples_order']);

    expect(mockTrx.commit).not.toHaveBeenCalled();
    expect(mockTrx.rollback).toHaveBeenCalled();
  });

  it('addSamples works correctly', async () => {
    mockSqlClient.where.mockImplementationOnce(() => { Promise.resolve(); });
    mockSqlClient.raw.mockImplementationOnce(() => 'RawSqlCommand');

    const newSamples = [mockSampleId, 'id2'];

    await new Experiment().addSamples(mockExperimentId, newSamples);

    expect(mockSqlClient.update).toHaveBeenCalledWith({ samples_order: 'RawSqlCommand' });
    expect(mockSqlClient.raw).toHaveBeenCalledWith('samples_order || \'["mockSampleId", "id2"]\'::jsonb');
    expect(mockSqlClient.where).toHaveBeenCalledWith('id', 'mockExperimentId');
  });

  it('deleteSample works correctly', async () => {
    mockSqlClient.where.mockImplementationOnce(() => { Promise.resolve(); });
    mockSqlClient.raw.mockImplementationOnce(() => 'RawSqlCommand');

    await new Experiment().deleteSample(mockExperimentId, mockSampleId);

    expect(mockSqlClient.update).toHaveBeenCalledWith({ samples_order: 'RawSqlCommand' });
    expect(mockSqlClient.raw).toHaveBeenCalledWith('samples_order - \'mockSampleId\'');
    expect(mockSqlClient.where).toHaveBeenCalledWith('id', 'mockExperimentId');
  });

  it('getProcessingConfig works', async () => {
    const mockFind = jest.spyOn(BasicModel.prototype, 'find')
      .mockImplementationOnce(() => Promise.resolve(getProcessingConfigResponse));

    const result = await new Experiment().getProcessingConfig(mockExperimentId);
    expect(mockFind).toHaveBeenCalledWith({ id: mockExperimentId });
    expect(result).toMatchSnapshot();
  });

  it('getProcessingConfig throws an error if there is no matching experiment', async () => {
    jest.spyOn(BasicModel.prototype, 'findOne')
      .mockImplementationOnce(() => Promise.resolve(undefined));

    expect(async () => {
      await new Experiment().getProcessingConfig(mockExperimentId);
    }).rejects.toThrow();
  });

  it('updateProcessingConfig works', async () => {
    const mockBody = [{
      name: 'classifier',
      body: {
        changedField: 'IamChanging so much',
      },
    }];

    mockSqlClient.where.mockImplementationOnce(() => { Promise.resolve(); });
    await new Experiment().updateProcessingConfig(mockExperimentId, mockBody);
    expect(mockSqlClient.where).toHaveBeenCalledWith('id', mockExperimentId);
  });

  it('downloadData returns signed url when the correct download type is given', async () => {
    const signedUrlSpy = mockS3GetSignedUrl();

    const experimentId = 'someExperiment-UUID-with-several-parts';
    const filenamePrefix = experimentId.split('-')[0];
    const expectedFileName = `${filenamePrefix}_processed_matrix.rds`;

    await new Experiment().getDownloadLink(experimentId, 'processed-matrix');

    expect(signedUrlSpy).toHaveBeenCalledWith(
      'getObject',
      {
        Bucket: `processed-matrix-test-${config.awsAccountId}`,
        Expires: 120,
        Key: `${experimentId}/r.rds`,
        ResponseContentDisposition: `attachment; filename ="${expectedFileName}"`,
      },
    );
  });

  it('downloadData throws error incorrect download type is given', async () => {
    new Experiment().getDownloadLink('12345', 'invalid type')
      .catch((error) => {
        expect(error.message).toMatch(/Invalid download type requested/gi);
      });
  });
});
