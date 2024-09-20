/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // We're using `pipeline_type::text = 'obj2s'` to cast the enum to a text type.
  // This avoids the potential issue of "unsafe use of new value" caused by enum strictness.
  await knex('experiment_execution')
    .where(knex.raw("pipeline_type::text = 'obj2s'")) // Cast enum to text for comparison
    .update({
      // Use jsonb_set to update the `sampleTechnology` key in the last_pipeline_params JSON field.
      // The third parameter, true, allows us to create the key if it doesn't exist.
      last_pipeline_params: knex.raw(
        'jsonb_set(last_pipeline_params::jsonb, \'{sampleTechnology}\', \'"seurat_object"\'::jsonb, true)',
      ),
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  // Revert the same logic in the down migration: cast the enum to text to avoid issues.
  await knex('experiment_execution')
    .where(knex.raw("pipeline_type::text = 'obj2s'")) // Again, cast enum to text for comparison
    .update({
      // Revert `sampleTechnology` key back to 'seurat' in the last_pipeline_params JSON field.
      last_pipeline_params: knex.raw(
        'jsonb_set(last_pipeline_params::jsonb, \'{sampleTechnology}\', \'"seurat"\'::jsonb, true)',
      ),
    });
};
