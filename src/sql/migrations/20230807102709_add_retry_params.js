exports.up = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.jsonb('retry_params').nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.dropColumn('retry_params');
  });
};
