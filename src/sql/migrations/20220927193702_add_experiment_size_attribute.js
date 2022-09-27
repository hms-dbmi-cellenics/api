/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.string('pod_size', 15).notNullable().defaultTo('default');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.dropColumn('pod_size');
  });
};
