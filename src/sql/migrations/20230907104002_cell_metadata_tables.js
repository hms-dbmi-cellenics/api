const defineDeleteCellMetadataFileIfOrphanFunc = `
  CREATE OR REPLACE FUNCTION delete_cell_metadata_file_if_orphan()
    RETURNS trigger AS $$
    BEGIN
      DELETE FROM cell_metadata_file
      WHERE
        cell_metadata_file.id = OLD.cell_metadata_file_id AND
        NOT EXISTS (
          SELECT FROM cell_metadata_file_to_experiment cm_map
          WHERE cm_map.cell_metadata_file_id = OLD.cell_metadata_file_id
        );
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
`;

const createDeleteCellMetadataFileIfOrphanTrigger = `
  CREATE TRIGGER delete_cell_metadata_file_if_orphan_trigger
  AFTER DELETE ON cell_metadata_file_to_experiment
  FOR EACH ROW
  EXECUTE FUNCTION delete_cell_metadata_file_if_orphan();
`;

exports.up = async (knex) => {
  await knex.schema.createTable('cell_metadata_file', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.enum('upload_status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).defaultTo('PENDING');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  })
    .then(() => knex.schema.createTable('cell_metadata_file_to_experiment', (table) => {
      table.uuid('experiment_id')
        .references('id')
        .inTable('experiment')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
      table.uuid('cell_metadata_file_id')
        .references('id')
        .inTable('cell_metadata_file')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    }))
    .then(() => knex.raw(defineDeleteCellMetadataFileIfOrphanFunc))
    .then(() => knex.raw(createDeleteCellMetadataFileIfOrphanTrigger));
};

exports.down = async (knex) => {
  // Drop the tables in reverse order to avoid foreign key constraints
  await knex.schema.dropTableIfExists('cell_metadata_file_to_experiment')
    .then(() => knex.schema.dropTableIfExists('cell_metadata_file'));
};
