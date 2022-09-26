exports.up = async (knex) => {
  await knex.raw(`
    CREATE TYPE sample_technology_temp AS ENUM ('10x','rhapsody','seurat');
    ALTER TABLE sample
      ALTER COLUMN sample_technology DROP DEFAULT,
      ALTER COLUMN sample_technology TYPE sample_technology_temp USING sample_technology::text::sample_technology_temp;
    DROP TYPE IF EXISTS sample_technology;
    ALTER TYPE sample_technology_temp RENAME TO sample_technology;
    
    CREATE TYPE sample_file_type_temp AS ENUM ('features10x','barcodes10x','matrix10x', 'rhapsody', 'seurat');
    ALTER TABLE sample_file
      ALTER COLUMN sample_file_type DROP DEFAULT,
      ALTER COLUMN sample_file_type TYPE sample_file_type_temp USING sample_file_type::text::sample_file_type_temp;
    DROP TYPE IF EXISTS sample_file_type;
    ALTER TYPE sample_file_type_temp RENAME TO sample_file_type;
    
    CREATE TYPE pipeline_type_temp AS ENUM ('qc','gem2s','seurat');
    ALTER TABLE experiment_execution
      ALTER COLUMN pipeline_type DROP DEFAULT,
      ALTER COLUMN pipeline_type TYPE pipeline_type_temp USING pipeline_type::text::pipeline_type_temp;
    DROP TYPE IF EXISTS pipeline_type;
    ALTER TYPE pipeline_type_temp RENAME TO pipeline_type;

    ALTER TABLE sample_file ALTER COLUMN size TYPE BIGINT;
  `);
};

exports.down = async (knex) => {
  await knex.raw(`
    CREATE TYPE sample_technology_temp AS ENUM ('10x','rhapsody');
    ALTER TABLE sample
      ALTER COLUMN sample_technology DROP DEFAULT,
      ALTER COLUMN sample_technology TYPE sample_technology_temp USING sample_technology::text::sample_technology_temp;
    DROP TYPE IF EXISTS sample_technology;
    ALTER TYPE sample_technology_temp RENAME TO sample_technology;

    CREATE TYPE sample_file_type_temp AS ENUM ('features10x','barcodes10x','matrix10x', 'rhapsody');
    ALTER TABLE sample_file
      ALTER COLUMN sample_file_type DROP DEFAULT,
      ALTER COLUMN sample_file_type TYPE sample_file_type_temp USING sample_file_type::text::sample_file_type_temp;
    DROP TYPE IF EXISTS sample_file_type;
    ALTER TYPE sample_file_type_temp RENAME TO sample_file_type;

    CREATE TYPE pipeline_type_temp AS ENUM ('qc','gem2s');
    ALTER TABLE experiment_execution
      ALTER COLUMN pipeline_type DROP DEFAULT,
      ALTER COLUMN pipeline_type TYPE pipeline_type_temp USING pipeline_type::text::pipeline_type_temp;
    DROP TYPE IF EXISTS pipeline_type;
    ALTER TYPE pipeline_type_temp RENAME TO pipeline_type;

    ALTER TABLE sample_file ALTER COLUMN size TYPE INT;
  `);
};

