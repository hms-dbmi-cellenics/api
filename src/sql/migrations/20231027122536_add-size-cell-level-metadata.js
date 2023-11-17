
exports.up = async (knex) => {
  await knex.schema.alterTable('cell_metadata_file', (table) => {
    table.string('size', 255).nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('cell_metadata_file', (table) => {
    table.dropColumn('size');
  });
};
