/**
 * An obj2s experiment has a single sample holding every image, segmentation and
 * molecule file of the uploaded object. Link each of these files to the sample
 * cell set it belongs to so they can be paired up. Null for every other file.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('sample_file', (table) => {
    table.uuid('obj2s_sample_id').nullable().defaultTo(null);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('sample_file', (table) => {
    table.dropColumn('obj2s_sample_id');
  });
};
