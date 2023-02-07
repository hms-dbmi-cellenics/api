
// publication_title
// publication_url
// data_source_title
// data_source_url
// species
// cell_count

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('experiment', (table) => {
    table.string('publication_title').nullable().defaultTo(null);
    table.string('publication_url').nullable().defaultTo(null);
    table.string('data_source_title').nullable().defaultTo(null);
    table.string('data_source_url').nullable().defaultTo(null);
    table.string('species').nullable().defaultTo(null);
    table.integer('cell_count').nullable().defaultTo(null);
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
