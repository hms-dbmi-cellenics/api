/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // enums that are created when UI receives upload of seurat spatial object
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'seurat_spatial_object';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'seurat_spatial_object';");

  // pipeline creates a ome zarr zip file for each sample in the seurat spatial object
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'ome_zarr_zip';");
};

/**
 * @returns { Promise < void> }
*/
exports.down = async () => { };
