/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'parse';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'matrixParse';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'barcodesParse';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'featuresParse';");
};

/**
 * @returns { Promise < void> }
*/
exports.down = async () => { };
