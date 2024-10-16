/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'seurat_spatial_object';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'seurat_spatial_object';");
};

/**
 * @returns { Promise < void> }
*/
exports.down = async () => { };
