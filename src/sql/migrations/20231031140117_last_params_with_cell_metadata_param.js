/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // last_pipeline_params was null for qc up to now, so we can just perform the
  // update without caring if there is something stored in last_pipeline_params
  // @ts-ignore
  await knex('experiment_execution')
    .where({ pipeline_type: 'qc' })
    .update({ last_pipeline_params: { cellMetadataId: null } });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex('experiment_execution')
    .where({ pipeline_type: 'qc' })
    .update({ last_pipeline_params: null });
};
