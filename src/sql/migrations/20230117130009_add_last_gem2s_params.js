exports.up = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.jsonb('last_pipeline_params').nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.dropColumn('last_pipeline_params');
  });
};
