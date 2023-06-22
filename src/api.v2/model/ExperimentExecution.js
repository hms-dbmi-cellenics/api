const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const selectableProps = [
  'experiment_id', 'pipeline_type', 'state_machine_arn', 'execution_arn',
  'last_status_response', 'last_gem2s_params',
];

class ExperimentExecution extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.EXPERIMENT_EXECUTION, selectableProps, ['metadata']);
  }

  async copyTo(fromExperimentId, toExperimentId, sampleIdsMap) {
    const { sql } = this;

    const originalRows = await sql(tableNames.EXPERIMENT_EXECUTION)
      .queryContext({ camelCaseExceptions: ['metadata'] })
      .select([
        'experiment_id',
        'pipeline_type',
        'state_machine_arn',
        'execution_arn',
        'last_status_response',
        'last_gem2s_params',
      ])
      .where({ experiment_id: fromExperimentId });

    const copyRows = [];

    originalRows.forEach((originalRow) => {
      const copyRow = {
        experiment_id: toExperimentId,
        pipeline_type: originalRow.pipelineType,
        state_machine_arn: originalRow.stateMachineArn,
        execution_arn: originalRow.executionArn,
        last_status_response: originalRow.lastStatusResponse,
        last_gem2s_params: originalRow.lastGem2SParams,
      };

      // If it's an actual gem2s run, translate sample ids from lastGem2SParams
      if (originalRow.pipelineType === 'gem2s' && originalRow.stateMachineArn.includes('gem2s')) {
        copyRow.last_gem2s_params.sampleIds = originalRow.lastGem2SParams.sampleIds
          .reduce(
            (acum, currSampleId) => {
              acum.push(sampleIdsMap[currSampleId]);
              return acum;
            }, [],
          );
      }

      copyRows.push(copyRow);
    });

    await sql(tableNames.EXPERIMENT_EXECUTION).insert(copyRows);
  }
}

module.exports = ExperimentExecution;
