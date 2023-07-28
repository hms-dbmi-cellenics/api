const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const selectableProps = [
  'experiment_id', 'pipeline_type', 'state_machine_arn', 'execution_arn',
  'last_status_response', 'last_pipeline_params',
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
        'last_pipeline_params',
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
        last_pipeline_params: originalRow.lastPipelineParams,
      };

      // If it's a setup run, translate sample ids from lastGem2SParams
      if (['gem2s', 'seurat'].includes(originalRow.pipelineType)) {
        copyRow.last_pipeline_params.sampleIds = originalRow.lastPipelineParams.sampleIds
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
