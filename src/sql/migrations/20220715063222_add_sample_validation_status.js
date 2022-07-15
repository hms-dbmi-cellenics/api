/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema
    .alterTable('sample', (table) => {
      table.boolean('valid');
      table.string('validation_message');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema
    .alterTable('sample', (table) => {
      table.dropColumn('valid');
      table.dropColumn('validation_message');
    });
};
