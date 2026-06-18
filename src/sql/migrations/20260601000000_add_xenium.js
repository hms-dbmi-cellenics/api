/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'xenium';");

  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_cell_feature_matrix';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_cells';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_cell_boundaries';");

  // No new pipeline-generated file type: Xenium reuses the existing
  // segmentations_ome_zarr_zip and has no ome_zarr_zip (no tissue image).
};

/**
 * @returns { Promise<void> }
 */
exports.down = async () => { };
