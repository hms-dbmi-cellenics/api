/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  // Rename the existing enum value 'seurat' to 'obj2s'
  await knex.raw('ALTER TYPE pipeline_type RENAME VALUE \'seurat\' TO \'obj2s\'');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  // Revert the enum value back from 'obj2s' to 'seurat'
  await knex.raw('ALTER TYPE pipeline_type RENAME VALUE \'obj2s\' TO \'seurat\'');
};
