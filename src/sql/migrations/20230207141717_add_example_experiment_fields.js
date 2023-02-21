/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.string('publication_title').nullable();
    table.string('publication_url').nullable();
    table.string('data_source_title').nullable();
    table.string('data_source_url').nullable();
    table.string('species').nullable();
    table.integer('cell_count').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.dropColumn('publication_title');
    table.dropColumn('publication_url');
    table.dropColumn('data_source_title');
    table.dropColumn('data_source_url');
    table.dropColumn('species');
    table.dropColumn('cell_count');
  });
};
