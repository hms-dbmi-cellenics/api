/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // Rename the existing enum value for pipeline_type 'seurat' to 'obj2s'
  await knex.raw("ALTER TYPE pipeline_type RENAME VALUE 'seurat' TO 'obj2s'");
  // Rename the existing enum values for technology 'seurat' to 'seurat_object'
  await knex.raw("ALTER TYPE sample_technology RENAME VALUE 'seurat' TO 'seurat_object';");
  await knex.raw("ALTER TYPE sample_file_type RENAME VALUE 'seurat' TO 'seurat_object';");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  // Revert the enum value back from 'obj2s' to 'seurat'
  await knex.raw("ALTER TYPE pipeline_type RENAME VALUE 'obj2s' TO 'seurat'");
  // Revert the enum values back from 'seurat_object' to 'seurat'
  await knex.raw("ALTER TYPE sample_technology RENAME VALUE 'seurat_object' TO 'seurat';");
  await knex.raw("ALTER TYPE sample_file_type RENAME VALUE 'seurat_object' TO 'seurat';");
};
