const changeExperimentIdType = async (typeSetter, knex) => {
  await knex.raw('ALTER TABLE "experiment" DROP CONSTRAINT experiment_pkey CASCADE');
  await knex.schema.alterTable('experiment', (table) => {
    typeSetter(table, 'id').primary().alter();
  });

  await knex.raw('ALTER TABLE "experiment_execution" DROP CONSTRAINT experiment_execution_pkey CASCADE');
  await knex.schema.alterTable('experiment_execution', (table) => {
    typeSetter(table, 'experiment_id').references('experiment.id').onDelete('CASCADE').alter();
    table.primary(['experiment_id', 'pipeline_type']);
  });

  await knex.schema.alterTable('sample', (table) => {
    typeSetter(table, 'experiment_id').notNullable()
      .references('experiment.id').onDelete('CASCADE')
      .alter();
  });

  await knex.raw('ALTER TABLE "metadata_track" DROP CONSTRAINT metadata_track_experiment_id_key_unique CASCADE');
  await knex.schema.alterTable('metadata_track', (table) => {
    typeSetter(table, 'experiment_id').notNullable()
      .references('experiment.id').onDelete('CASCADE')
      .alter();

    table.unique(['experiment_id', 'key']);
  });

  await knex.raw('ALTER TABLE "plot" DROP CONSTRAINT plot_pkey CASCADE');
  await knex.schema.alterTable('plot', (table) => {
    typeSetter(table, 'experiment_id').references('experiment.id').onDelete('CASCADE').alter();
    table.primary(['id', 'experiment_id']);
  });

  await knex.raw('ALTER TABLE "invite_access" DROP CONSTRAINT invite_access_pkey CASCADE');
  await knex.schema.alterTable('invite_access', (table) => {
    typeSetter(table, 'experiment_id').references('experiment.id').onDelete('CASCADE').alter();
    table.primary(['user_email', 'experiment_id']);
  });

  await knex.raw('ALTER TABLE "user_access" DROP CONSTRAINT user_access_pkey CASCADE');
  await knex.schema.alterTable('user_access', (table) => {
    typeSetter(table, 'experiment_id').references('experiment.id').onDelete('CASCADE').alter();
    table.primary(['user_id', 'experiment_id']);
  });
};

/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
exports.up = async (knex) => {
  await changeExperimentIdType((table, columnName) => table.uuid(columnName), knex);
};

/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
exports.down = async (knex) => {
  await changeExperimentIdType((table, columnName) => table.string(columnName), knex);
};
