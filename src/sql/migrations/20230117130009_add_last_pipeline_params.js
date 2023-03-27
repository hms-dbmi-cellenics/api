exports.up = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.renameColumn('last_gem2s_params', 'last_pipeline_params');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.renameColumn('last_pipeline_params', 'last_gem2s_params');
  });
};
