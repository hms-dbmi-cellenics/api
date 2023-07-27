exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'seurat';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'seurat';");
  await knex.raw("ALTER TYPE pipeline_type ADD VALUE 'seurat';");
  await knex.raw('ALTER TABLE sample_file ALTER COLUMN size TYPE BIGINT;');
};

exports.down = async () => { };
