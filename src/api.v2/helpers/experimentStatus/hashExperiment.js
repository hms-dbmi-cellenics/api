const crypto = require('crypto');
const Sample = require('../../model/Sample');

const hashObject = (object) => {
  const shasum = crypto.createHash('sha1');

  const stringObject = JSON.stringify(object);

  shasum.update(stringObject);
  return shasum.digest('hex');
};

const hashExperiment = async (experimentId) => {
  const samples = await new Sample().getSamples(experimentId);

  const samplesObj = samples.reduce(
    (acc, current) => {
      acc[current.id] = current;
      return acc;
    },
    {},
  );

  const { sampleTechnology, metadata } = samples[0];

  const sampleIds = Object.keys(samplesObj).sort();
  const sampleNames = sampleIds.map((id) => samplesObj[id].name);
  const sampleOptions = sampleIds.map((id) => samplesObj[id].options);

  // Handle metadata
  const metadataInvariant = Object.keys(metadata).sort();
  const metadataField = metadataInvariant.reduce(
    (acc, current) => {
      // Make sure the key does not contain '-' as it will cause failure in GEM2S
      const sanitizedKey = current.replace(/-+/g, '_');

      const entries = sampleIds.map((id) => samplesObj[id].metadata[current]);
      acc[sanitizedKey] = entries;
      return acc;
    },
    {},
  );

  const params = {
    sampleTechnology,
    sampleIds,
    sampleNames,
    sampleOptions,
    metadata: metadataField,
  };

  return hashObject(params);
};

module.exports = hashExperiment;
