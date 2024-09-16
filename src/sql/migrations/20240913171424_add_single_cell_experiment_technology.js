/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_technology ADD VALUE 'single_cell_experiment';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'single_cell_experiment';");
};

/**
 * @returns { Promise < void> }
*/
exports.down = async () => { };
