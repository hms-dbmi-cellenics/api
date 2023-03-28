exports.up = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.jsonb('last_gem2s_params').nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('experiment_execution', (table) => {
    table.dropColumn('last_gem2s_params');
  });
};
