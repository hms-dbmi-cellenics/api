/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.integer('pod_cpus');
    table.integer('pod_memory');
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
