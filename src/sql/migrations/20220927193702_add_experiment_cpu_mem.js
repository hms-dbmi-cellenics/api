/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.integer('pod_cpus').notNullable().defaultTo(4);
    table.integer('pod_memory').notNullable().defaultTo(29);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.dropColumn('pod_cpus');
    table.dropColumn('pod_memory');
  });
};
