/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'xenium';");

  // user-uploaded Xenium files
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_cell_feature_matrix';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_cells';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_cell_boundaries';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_transcripts';");

  // pipeline-generated per-gene molecule artifact. Xenium has no tissue image,
  // so it reuses the existing segmentations_ome_zarr_zip and adds no ome_zarr_zip.
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'molecules_by_gene';");
};

/**
 * @returns { Promise<void> }
 */
exports.down = async () => { };
