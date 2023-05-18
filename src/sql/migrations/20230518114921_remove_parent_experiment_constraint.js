/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('experiment_parent', (table) => {
    table.dropForeign('parent_experiment_id');
    table.foreign('parent_experiment_id').references('experiment.id').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('experiment_parent', (table) => {
    table.dropForeign('parent_experiment_id');
    table.foreign('parent_experiment_id').references('experiment.id').onDelete('NO ACTION');
  });
};
