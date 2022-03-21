// const _ = require('lodash');

const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');

const tableName = 'experiment';

const experimentFields = [
  'id', 'name', 'description', 'samples_order as samplesOrder',
  'notify_by_email as notifyByEmail', 'created_at as createdAt', 'updated_at as updatedAt',
];
const experimentFieldsOrig = [
  'id', 'name', 'description', 'samples_order',
  'notify_by_email', 'created_at', 'updated_at',
];

// const experimentExecutionFieldsAggregate = [
//   'experiment_id as experimentId', 'pipeline_type as pipelineType', 'params_hash as paramsHash',
//   'state_machine_arn as stateMachineArn', 'execution_arn as executionArn',
// ];

// const experimentExecutionFieldsOrig = [
//   'experiment_id', 'pipeline_type', 'params_hash',
//   'state_machine_arn', 'execution_arn',
// ];

const experimentExecutionFieldsAggregate = [
  '\'pipelineType\', pipeline_type', '\'paramsHash\', params_hash',
  '\'stateMachineArn\', state_machine_arn', '\'executionArn\', execution_arn',
];

const basicModelFunctions = generateBasicModelFunctions({
  tableName,
  selectableProps: experimentFields,
});

// id:
// type: string
// name:
// type: string
// description:
// type: string
// sampleOrder:
// type: array
// items:
// type: string
// notifyByEmail:
// type: boolean
// createdAt:
// type: string
// updatedAt:
// type: string
// executionGem2s:
// $ref: ./ Gem2sExecution.v2.yaml
// executionQC:
// $ref: ./ QCExecution.v2.yaml

const getExperimentData = async (experimentId) => {
  // const results = await sqlClient.get()
  //   .select(...experimentFields, ...experimentExecutionFields)
  //   .from(tableName)
  //   .leftJoin('experiment_execution', `${tableName}.id`, 'experiment_execution.experiment_id')
  //   .where('id', experimentId);

  const sql = sqlClient.get();

  const results = await sql
    .select([...experimentFields, sql.raw(`jsonb_object_agg(pipeline_type, json_build_object(${experimentExecutionFieldsAggregate.join(', ')}))`)])
    // eslint-disable-next-line func-names
    .from(function () {
      this.select('*')
        .from(tableName)
        .leftJoin('experiment_execution', `${tableName}.id`, 'experiment_execution.experiment_id')
        .where('id', experimentId)
        .as('queryResult');
    }).groupBy(experimentFieldsOrig);

  console.log('resultsDebug');
  console.log(JSON.stringify(results));

  // const resultObject = results;

  // const resultObject = _.pick(
  //   results[0],
  //   ['id', 'name', 'description', 'sample_order', 'notify_by_email', 'created_at', 'updated_at'],
  // );

  return results;
};

module.exports = {
  getExperimentData,
  ...basicModelFunctions,
};
