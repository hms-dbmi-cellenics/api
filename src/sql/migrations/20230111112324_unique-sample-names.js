
exports.up = async (knex) => {
  await knex.raw('ALTER TABLE sample ADD CONSTRAINT unique_sample_names UNIQUE (name, experiment_id);');
};

exports.down = async (knex) => {
  await knex.raw('ALTER TABLE sample DROP CONSTRAINT unique_sample_names;');
};
