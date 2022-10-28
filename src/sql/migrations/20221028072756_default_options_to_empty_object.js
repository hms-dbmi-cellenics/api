/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // Update all null values to empty object
  await knex.table('sample').update({ options: '{}' }).where({ options: null });

  await knex.schema.alterTable('sample', (table) => {
    table.jsonb('options').notNullable().defaultTo('{}').alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('sample', (table) => {
    table.jsonb('options').nullable().alter();
  });
};
