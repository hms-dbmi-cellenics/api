/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'xenium_transcripts';");
  await knex.raw("ALTER TYPE sample_file_type ADD VALUE 'molecules_by_gene';");
};

/**
 * @returns { Promise<void> }
 */
exports.down = async () => { };
