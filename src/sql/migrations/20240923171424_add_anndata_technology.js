/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'anndata_object';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'anndata_object';");
};

/**
 * @returns { Promise < void> }
*/
exports.down = async () => { };
