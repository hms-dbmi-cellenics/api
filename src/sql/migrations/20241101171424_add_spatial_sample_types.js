/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'obj2s_sample';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'ome_zarr_zip';");
};

/**
 * @returns { Promise < void> }
*/
exports.down = async () => { };
