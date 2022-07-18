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

  await knex.raw('UPDATE "sample" SET "valid" = true');

  await knex.schema
    .alterTable('sample', async (table) => {
      table.dropNullable('valid');
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
