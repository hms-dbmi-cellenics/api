/* eslint-disable camelcase */
// @ts-ignore
const objectHash = require('object-hash');

const METADATA_DEFAULT_VALUE = 'N.A';


// Version from commit: https://github.com/biomage-org/ui/tree/17186e9dd6825c272e856ee7292e73907dd3f148
// Node14 has partial support for optional chaining operator (?.), I removed them for this migration
// I also switched the order of .filter() and .sort() (line 19-20) so it's faster.
const oldGenerateGem2sParamsHash = (experiment, samples) => {
  if (!experiment || !samples) {
    return false;
  }
  const projectSamples = Object.entries(samples)
    .filter(([key]) => experiment.sampleIds.includes(key))
    .sort();

  const existingSampleIds = projectSamples.map(([, sample]) => sample.uuid);

  // Different sample order should not change the hash.
  const orderInvariantSampleIds = [...existingSampleIds].sort();

  const hashParams = {
    organism: null,
    input: { type: '10x' },
    sampleIds: orderInvariantSampleIds,
    sampleNames: orderInvariantSampleIds.map((sampleId) => samples[sampleId].name),
  };

  if (experiment.metadataKeys.length) {
    const orderInvariantProjectMetadataKeys = [...experiment.metadataKeys].sort();

    hashParams.metadata = orderInvariantProjectMetadataKeys.reduce((acc, key) => {
      // Make sure the key does not contain '-' as it will cause failure in GEM2S
      const sanitizedKey = key.replace(/-+/g, '_');

      acc[sanitizedKey] = projectSamples.map(
        ([, sample]) => sample.metadata[key] || METADATA_DEFAULT_VALUE,
      );
      return acc;
    }, {});
  }

  const newHash = objectHash.sha1(
    hashParams,
    { unorderedObjects: true, unorderedArrays: true, unorderedSets: true },
  );

  return newHash;
};

// Version from commit: https://github.com/biomage-org/ui/tree/844b3a6c4d9016dda938032cc20653c45ec0cf7b
// Node14 has partial support for optional chaining operator (?.), I removed them for this migration
const newGenerateGem2sParamsHash = (experiment, samples) => {
  if (!experiment || !samples) {
    return false;
  }

  // Different sample order should not change the hash.
  const orderInvariantSampleIds = [...experiment.sampleIds].sort();
  const sampleTechnology = samples[orderInvariantSampleIds[0]].type;

  const hashParams = {
    organism: null,
    sampleTechnology,
    sampleIds: orderInvariantSampleIds,
    sampleNames: orderInvariantSampleIds.map((sampleId) => samples[sampleId].name),
    sampleOptions: orderInvariantSampleIds.map((sampleId) => samples[sampleId].options),
  };

  if (experiment.metadataKeys.length) {
    const orderInvariantProjectMetadataKeys = [...experiment.metadataKeys].sort();

    hashParams.metadata = orderInvariantProjectMetadataKeys.reduce((acc, key) => {
      // Make sure the key does not contain '-' as it will cause failure in GEM2S
      const sanitizedKey = key.replace(/-+/g, '_');

      acc[sanitizedKey] = orderInvariantSampleIds.map(
        (sampleId) => samples[sampleId].metadata[key] || METADATA_DEFAULT_VALUE,
      );
      return acc;
    }, {});
  }

  const newHash = objectHash.sha1(
    hashParams,
    { unorderedObjects: true, unorderedArrays: true, unorderedSets: true },
  );

  return newHash;
};

const tables = {
  EXPERIMENT: 'experiment',
  EXPERIMENT_EXECUTION: 'experiment_execution',
  METADATA_TRACK: 'metadata_track',
  SAMPLE: 'sample',
  METADATA_VALUE: 'sample_in_metadata_track_map',
};

const getExperimentData = async (sqlClient) => {
  let experiments = await sqlClient.select(['id', 'samples_order']).from(tables.EXPERIMENT);
  let metadataTracks = await sqlClient.select(['experiment_id', 'key']).from(tables.METADATA_TRACK);

  metadataTracks = metadataTracks.reduce((acc, { experimentId, key }) => {
    if (!acc[experimentId]) {
      acc[experimentId] = [];
    }
    acc[experimentId].push(key);

    return acc;
  }, {});

  // Transform experiments into a map so that it' easier to search
  experiments = experiments.reduce((acc, curr) => {
    acc[curr.id] = {
      id: curr.id,
      sampleIds: curr.samplesOrder || [],
      metadataKeys: metadataTracks[curr.id] || [],
    };

    return acc;
  }, {});

  return experiments;
};

const getSamplesData = async (sqlClient) => {
  let samples = await sqlClient.select(['id', 'name', 'sample_technology', 'options']).from(tables.SAMPLE);
  let metadataValue = await sqlClient.select(['sample_id', 'key', 'value']).from(tables.METADATA_VALUE).innerJoin(tables.METADATA_TRACK, 'metadata_track_id', `${tables.METADATA_TRACK}.id`);

  metadataValue = metadataValue.reduce((acc, curr) => {
    acc[curr.sampleId] = {
      ...acc[curr.sampleId],
      [curr.key]: curr.value,
    };

    return acc;
  }, {});

  samples = samples.reduce((acc, curr) => {
    acc[curr.id] = {
      uuid: curr.id,
      name: curr.name,
      type: curr.sampleTechnology,
      metadata: metadataValue[curr.id],
      options: curr.options,
    };

    return acc;
  }, {});

  return samples;
};

const updateParamsHash = async (sqlClient, updates) => {
  const updatesPromise = updates.map(async ({ experiment_id, params_hash }) => {
    await sqlClient(tables.EXPERIMENT_EXECUTION)
      .update({ params_hash })
      .where({
        pipeline_type: 'gem2s',
        experiment_id,
      });
    console.log(`- Experiment ${experiment_id} successfully updated`);
  });

  return Promise.all(updatesPromise);
};

const migrateGem2sParamsHash = async (knex, isMigrateUp) => {
  console.log('Getting experiments data...');
  const experiments = await getExperimentData(knex);
  console.log('Finished getting experiments data...');

  console.log('Getting samples data...');
  const samples = await getSamplesData(knex);
  console.log('Finished getting samples data...');

  const updateValues = Object.values(experiments).map((experiment) => ({
    experiment_id: experiment.id,
    params_hash: isMigrateUp
      ? newGenerateGem2sParamsHash(experiment, samples)
      : oldGenerateGem2sParamsHash(experiment, samples),
  }));

  console.log(`Updating paramsHash of ${updateValues.length} experiments`);

  await updateParamsHash(knex, updateValues);
  console.log(`${updateValues.length} experiments updated`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('sample', (table) => {
    table.jsonb('options');
  });

  await migrateGem2sParamsHash(knex, true);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  // Migrate params first, otherwise query will fail
  // because the column 'option' is removed from table
  await migrateGem2sParamsHash(knex, false);

  await knex.schema.alterTable('sample', (table) => {
    table.dropColumn('options');
  });
};
