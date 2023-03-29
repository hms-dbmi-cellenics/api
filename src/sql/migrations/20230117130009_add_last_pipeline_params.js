exports.up = async (knex) => {
  // for HMS deployment last_gem2s_params was always called last_pipeline_params
  const hasLastGem2sParams = await knex.schema.hasColumn('experiment_execution', 'last_gem2s_params');

  if (hasLastGem2sParams) {
    await knex.schema.alterTable('experiment_execution', (table) => {
      table.renameColumn('last_gem2s_params', 'last_pipeline_params');
    });
  }
};

exports.down = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.renameColumn('last_pipeline_params', 'last_gem2s_params');
  });
};
