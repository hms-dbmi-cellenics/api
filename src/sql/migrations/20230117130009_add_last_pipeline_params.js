exports.up = (knex) => {
  const hasLastGem2sParams = knex.schema.hasColumn('experiment_execution', 'last_gem2s_params');

  knex.schema.hasColumn('experiment_execution', 'last_gem2s_params')
    .then((exists) => {
      console.log('exists');
      console.log(exists);
    });

  console.log('hasLastGem2sParams');
  console.log(hasLastGem2sParams);

  if (hasLastGem2sParams) {
    console.log('here!!!');
    return knex.schema.alterTable('experiment_execution', (table) => {
      table.renameColumn('last_gem2s_params', 'last_pipeline_params');
    });
  }
};

exports.down = (knex) => knex.schema.alterTable('experiment_execution', (table) => {
  table.renameColumn('last_pipeline_params', 'last_gem2s_params');
});
