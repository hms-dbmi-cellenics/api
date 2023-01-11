/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // Add bool that determines whether we can rerun gem2s or not
  await knex.schema.alterTable('experiment', (table) => {
    table.boolean('can_rerun_gem2s').defaultTo(true);
  });

  // Reference to remember where each subset experiment comes from
  await knex.schema
    .createTable('experiment_parent', (table) => {
      table.uuid('experiment_id').references('experiment.id').onDelete('CASCADE').primary();
      table.uuid('parent_experiment_id').references('experiment.id').onDelete('NO ACTION');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.dropColumn('can_rerun_gem2s');
  });

  await knex.schema.dropTable('experiment_parent');
};
