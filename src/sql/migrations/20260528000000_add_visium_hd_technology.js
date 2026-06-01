/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'visium_hd';");

  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'visium_hd_filtered_feature_cell_matrix';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'visium_hd_cell_segmentations';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'visium_hd_tissue_hires_image';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'visium_hd_scalefactors_json';");
};

/**
 * @returns { Promise<void> }
 */
exports.down = async () => { };
