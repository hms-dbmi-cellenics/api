/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // Update the last_pipeline_params to set sampleTechnology to seurat_object where it is currently seurat
  await knex('experiment_execution')
    .where({ pipeline_type: 'obj2s' })
    .update({
      last_pipeline_params: knex.raw("jsonb_set(last_pipeline_params::jsonb, '{sampleTechnology}', '\"seurat_object\"'::jsonb)"),
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  // Revert sampleTechnology back to seurat
  await knex('experiment_execution')
    .where({ pipeline_type: 'obj2s' })
    .update({
      last_pipeline_params: knex.raw("jsonb_set(last_pipeline_params::jsonb, '{sampleTechnology}', '\"seurat\"'::jsonb)"),
    });
};
