
const setOnUpdateTrigger = (table) => (`
  CREATE TRIGGER ${table}_updated_at_trigger
  BEFORE UPDATE ON ${table}
  FOR EACH ROW
  EXECUTE PROCEDURE on_update_timestamp();
`);

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw('CREATE TYPE pipeline_type AS ENUM (\'qc\', \'gem2s\');');
  await knex.raw('CREATE TYPE sample_technology AS ENUM (\'10x\', \'rhapsody\');');
  await knex.raw('CREATE TYPE sample_file_type AS ENUM (\'features10x\', \'barcodes10x\', \'matrix10x\', \'rhapsody\');');
  await knex.raw(
    'CREATE TYPE upload_status AS ENUM (\'uploaded\', \'uploading\', \'compressing\', \'uploadError\', \'fileNotFound\');',
  );

  await knex.schema
    .createTable('experiment', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('description').notNullable();
      table.jsonb('processing_config').notNullable();
      table.boolean('notify_by_email').notNullable();
      // Based on https://stackoverflow.com/a/48028011
      table.timestamps(true, true);
    }).then(() => {
      knex.raw(setOnUpdateTrigger('experiment'));
    });

  await knex.schema
    .createTable('experiment_execution', (table) => {
      table.uuid('experiment_id').references('experiment.id').onDelete('CASCADE');
      table.enu('pipeline_type', null, { useNative: true, existingType: true, enumName: 'pipeline_type' });
      table.string('params_hash').notNullable();
      table.string('state_machine_arn').notNullable();
      table.string('execution_arn').notNullable();

      table.primary(['experiment_id', 'pipeline_type']);
    });

  await knex.schema
    .createTable('sample', (table) => {
      table.uuid('id').primary();
      table.uuid('experiment_id').references('experiment.id').onDelete('CASCADE');
      table.string('name');
      table.enu('sample_technology', null, { useNative: true, existingType: true, enumName: 'sample_technology' });
      table.timestamps(true, true);
    }).then(() => {
      knex.raw(setOnUpdateTrigger('experiment'));
    });

  await knex.schema
    .createTable('sample_file', (table) => {
      table.uuid('id').primary();
      table.enu('sample_file_type', null, { useNative: true, existingType: true, enumName: 'sample_file_type' });
      table.boolean('valid');
      table.string('s3_path');
      table.enu('upload_status', null, { useNative: true, existingType: true, enumName: 'upload_status' });

      table.timestamp('updated_at').defaultTo(knex.fn.now());
    }).then(() => {
      knex.raw(setOnUpdateTrigger('experiment'));
    });

  await knex.schema
    .createTable('metadata_track', (table) => {
      table.string('key').primary();
      table.uuid('experiment_id').references('experiment.id').onDelete('CASCADE');
    });

  await knex.schema
    .createTable('sample_to_sample_file_map', (table) => {
      table.uuid('sample_id');
      table.uuid('experiment_id').references('experiment.id').onDelete('CASCADE');

      table.primary(['sample_id', 'experiment_id']);
    });

  await knex.schema
    .createTable('sample_in_metadata_track_map', (table) => {
      table.string('metadata_track_key').references('metadata_track.key').onDelete('CASCADE');
      table.uuid('sample_id').references('sample.id').onDelete('CASCADE');
      table.string('value');

      table.primary(['metadata_track_key', 'sample_id']);
    });

  await knex.schema
    .createTable('plot', (table) => {
      table.uuid('id').primary();
      table.uuid('experiment_id').references('experiment.id').onDelete('CASCADE');
      table.jsonb('config');
      table.string('plot_s3_data_key');
    });

  await knex.schema
    .createTable('invite_access', (table) => {
      table.string('user_email', 255).notNullable();
      table.uuid('experiment_id').notNullable().references('experiment.id');
      table.string('role', 36).notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.primary(['user_email', 'experiment_id']);
    }).then(() => {
      knex.raw(setOnUpdateTrigger('invite-access'));
    });

  await knex.schema
    .createTable('user_access', (table) => {
      table.uuid('user_id').notNullable();
      table.uuid('experiment_id').references('experiment.id').onDelete('CASCADE');
      table.string('role', 36).notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.primary(['user_id', 'experiment_id']);
    }).then(() => {
      knex.raw(setOnUpdateTrigger('invite-access'));
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return Promise.all([
    knex.schema.dropTable('user_access'),
    knex.schema.dropTable('invite_access'),
    knex.schema.dropTable('plot'),
    knex.schema.dropTable('sample_in_metadata_track_map'),
    knex.schema.dropTable('sample_to_sample_file_map'),
    knex.schema.dropTable('metadata_track'),
    knex.schema.dropTable('sample_file'),
    knex.schema.dropTable('sample'),
    knex.schema.dropTable('experiment_execution'),
    knex.schema.dropTable('experiment'),
    knex.schema.raw('DROP TYPE upload_status;'),
    knex.schema.raw('DROP TYPE sample_file_type;'),
    knex.schema.raw('DROP TYPE sample_technology;'),
    knex.schema.raw('DROP TYPE pipeline_type;'),
  ]);
};
