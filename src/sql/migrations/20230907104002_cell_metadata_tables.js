const {
  CELL_METADATA,
} = require('../../config/bucketNames');

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

const getTriggerFunction = (dbEnv, key, bucketName) => {
  let body = '';
  const triggerLambdaARN = `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:delete-s3-file-lambda-${dbEnv}`;

  // Removing the environment and account id from the bucket name.
  // When making a migration, the environment would be development,
  // due to the fact that the migration is ran locally,
  // so we need to add the environment and accountID in the lambda itself
  const rawBucketName = bucketName.split('-').slice(0, -2).join('-');

  // We skip creation of the triggers and functions in development
  // because it requires aws_commons and aws_lambda modules which are proprietary.
  if (['production', 'staging'].includes(dbEnv)) {
    body = `PERFORM aws_lambda.invoke('${triggerLambdaARN}', json_build_object('key',OLD.${key}, 'bucketName', '${rawBucketName}'), '${process.env.AWS_REGION}', 'Event');`;
  }

  return body;
};

const nativeEnum = (table, tableName) => (
  table.enu(tableName, null, { useNative: true, existingType: true, enumName: tableName })
);

const createDeleteCellMetadataTriggerFunc = (env) => {
  const body = getTriggerFunction(env, 'id', CELL_METADATA);

  const template = `
    CREATE OR REPLACE FUNCTION public.delete_file_from_s3_after_cell_metadata_delete()
      RETURNS trigger
      LANGUAGE plpgsql
    AS $function$
    BEGIN
      ${body}
      return OLD;
    END;
    $function$;

    CREATE TRIGGER delete_file_from_s3_after_cell_metadata_delete_trigger
    AFTER DELETE ON cell_metadata_file
    FOR EACH ROW EXECUTE FUNCTION public.delete_file_from_s3_after_cell_metadata_delete();
    `;

  return template;
};

exports.up = async (knex) => {
  await knex.schema.createTable('cell_metadata_file', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    nativeEnum(table, 'upload_status').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('cell_metadata_file_to_experiment', (table) => {
    table.uuid('experiment_id')
      .references('id')
      .inTable('experiment')
      .onDelete('CASCADE');
    table.uuid('cell_metadata_file_id')
      .references('id')
      .inTable('cell_metadata_file')
      .onDelete('CASCADE');
    table.primary(['experiment_id', 'cell_metadata_file_id']);
  });
  await knex.raw(defineDeleteCellMetadataFileIfOrphanFunc);
  await knex.raw(createDeleteCellMetadataFileIfOrphanTrigger);
  await knex.raw(createDeleteCellMetadataTriggerFunc(process.env.NODE_ENV));
};

exports.down = async (knex) => {
  // Drop the tables in reverse order to avoid foreign key constraints
  await knex.schema.dropTableIfExists('cell_metadata_file_to_experiment');
  await knex.schema.dropTableIfExists('cell_metadata_file');
  await knex.raw(`
    DROP TRIGGER IF EXISTS delete_file_from_s3_after_cell_metadata_delete_trigger ON cell_metadata_file;
    DROP FUNCTION IF EXISTS public.delete_file_from_s3_after_cell_metadata_delete;

    DROP TRIGGER IF EXISTS delete_cell_metadata_file_if_orphan_trigger ON cell_metadata_file;
    DROP FUNCTION IF EXISTS public.delete_cell_metadata_file_if_orphan;
  `);
};
