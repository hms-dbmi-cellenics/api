/* eslint-disable max-len */
/* eslint-disable camelcase */
// @ts-ignore
// const objectHash = require('object-hash');

// const METADATA_DEFAULT_VALUE = 'N.A';

// // Version from commit: https://github.com/biomage-org/ui/tree/844b3a6c4d9016dda938032cc20653c45ec0cf7b
// // Node14 has partial support for optional chaining operator (?.), I removed them for this migration
// const newGenerateGem2sParamsHash = (experiment, samples) => {
//   if (!experiment || !samples || experiment.sampleIds.length === 0) {
//     return false;
//   }

//   // Different sample order should not change the hash.
//   const orderInvariantSampleIds = [...experiment.sampleIds].sort();

//   if (!(orderInvariantSampleIds.every((sampleId) => samples[sampleId]))) {
//     return false;
//   }

//   const sampleTechnology = samples[orderInvariantSampleIds[0]].type;

//   const hashParams = {
//     organism: null,
//     sampleTechnology,
//     sampleIds: orderInvariantSampleIds,
//     sampleNames: orderInvariantSampleIds.map((sampleId) => samples[sampleId].name),
//     sampleOptions: orderInvariantSampleIds.map((sampleId) => samples[sampleId].options),
//   };

//   if (experiment.metadataKeys.length) {
//     const orderInvariantProjectMetadataKeys = [...experiment.metadataKeys].sort();

//     hashParams.metadata = orderInvariantProjectMetadataKeys.reduce((acc, key) => {
//       // Make sure the key does not contain '-' as it will cause failure in GEM2S
//       const sanitizedKey = key.replace(/-+/g, '_');

//       acc[sanitizedKey] = orderInvariantSampleIds.map(
//         (sampleId) => samples[sampleId].metadata[key] || METADATA_DEFAULT_VALUE,
//       );
//       return acc;
//     }, {});
//   }

//   const newHash = objectHash.sha1(
//     hashParams,
//     { unorderedObjects: true, unorderedArrays: true, unorderedSets: true },
//   );

//   return newHash;
// };

// const tables = {
//   EXPERIMENT: 'experiment',
//   EXPERIMENT_EXECUTION: 'experiment_execution',
//   METADATA_TRACK: 'metadata_track',
//   SAMPLE: 'sample',
//   METADATA_VALUE: 'sample_in_metadata_track_map',
// };

// const getExperimentData = async (sqlClient) => {
//   let experiments = await sqlClient.select(['id', 'samples_order']).from(tables.EXPERIMENT);
//   let metadataTracks = await sqlClient.select(['experiment_id', 'key']).from(tables.METADATA_TRACK);

//   metadataTracks = metadataTracks.reduce((acc, { experiment_id, key }) => {
//     if (!acc[experiment_id]) {
//       acc[experiment_id] = [];
//     }
//     acc[experiment_id].push(key);

//     return acc;
//   }, {});

//   // Transform experiments into a map so that it' easier to search
//   experiments = experiments.reduce((acc, curr) => {
//     acc[curr.id] = {
//       id: curr.id,
//       sampleIds: curr.samples_order || [],
//       metadataKeys: metadataTracks[curr.id] || [],
//     };

//     return acc;
//   }, {});

//   return experiments;
// };

// const getSamplesData = async (sqlClient) => {
//   let samples = await sqlClient.select(['id', 'name', 'sample_technology', 'options']).from(tables.SAMPLE);
//   let metadataValue = await sqlClient.select(['sample_id', 'key', 'value']).from(tables.METADATA_VALUE).innerJoin(tables.METADATA_TRACK, 'metadata_track_id', `${tables.METADATA_TRACK}.id`);

//   metadataValue = metadataValue.reduce((acc, curr) => {
//     acc[curr.sample_id] = {
//       ...acc[curr.sample_id],
//       [curr.key]: curr.value,
//     };

//     return acc;
//   }, {});

//   samples = samples.reduce((acc, curr) => {
//     acc[curr.id] = {
//       uuid: curr.id,
//       name: curr.name,
//       type: curr.sample_technology,
//       metadata: metadataValue[curr.id],
//       options: curr.options,
//     };

//     return acc;
//   }, {});

//   return samples;
// };

// const updateParamsHash = async (sqlClient, updates) => {
//   const updatesPromise = updates.map(async ({ experiment_id, params_hash }) => {
//     await sqlClient(tables.EXPERIMENT_EXECUTION)
//       .update({ params_hash })
//       .where({
//         pipeline_type: 'seurat',
//         experiment_id,
//       });
//   });

//   return Promise.all(updatesPromise);
// };

// const migrateGem2sParamsHash = async (knex) => {
//   const experiments = await getExperimentData(knex);
//   const samples = await getSamplesData(knex);

//   const updateValues = Object.values(experiments).map((experiment) => ({
//     experiment_id: experiment.id,
//     params_hash: newGenerateGem2sParamsHash(experiment, samples),
//   })).filter(({ params_hash }) => params_hash !== false);

//   await updateParamsHash(knex, updateValues);
// };


// exports.up = async () => {
//   // Update all null values to empty object
//   await knex.table('sample').update({ options: '{}' }).where({ options: null });

//   // Recalculate gem2sParamsHash again
//   await migrateGem2sParamsHash(knex);

//   await knex.schema.alterTable('sample', (table) => {
//     table.jsonb('options').notNullable().defaultTo('{}').alter();
//   });
// };

// exports.down = async () => {
//   await knex.schema.alterTable('sample', (table) => {
//     table.jsonb('options').nullable().alter();
//   });
// };


// This migration is a copy of the original one: 20221028072756_default_options_to_empty_object
//  so this one is fully commented out
exports.up = async () => {
};

exports.down = async () => {
};
