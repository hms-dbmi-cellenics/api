exports.up = async (knex) => {
  await knex.raw(`
    CREATE TYPE sample_technology_temp AS ENUM ('10x','rhapsody','seurat');
    ALTER TABLE sample
      ALTER COLUMN sample_technology DROP DEFAULT,
      ALTER COLUMN sample_technology TYPE sample_technology_temp USING sample_technology::text::sample_technology_temp;
    DROP TYPE IF EXISTS sample_technology;
    ALTER TYPE sample_technology_temp RENAME TO sample_technology;
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
  `);
};

