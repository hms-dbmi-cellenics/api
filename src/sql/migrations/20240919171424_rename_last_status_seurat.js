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
      // Use jsonb_set to add the new `obj2s` key to last_status_response with the value from `seurat`.
      // Then, remove the old `seurat` key from last_status_response.
      last_status_response: knex.raw(
        'jsonb_set(last_status_response::jsonb, \'{obj2s}\', last_status_response::jsonb->\'seurat\', true) - \'seurat\'',
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
      // Revert the key change by adding `seurat` back and removing `obj2s`.
      last_status_response: knex.raw(
        'jsonb_set(last_status_response::jsonb, \'{seurat}\', last_status_response::jsonb->\'obj2s\', true) - \'obj2s\'',
      ),
    });
};
