const Sample = require('../../model/Sample');

const getGem2sParams = async (experimentId) => {
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

  return {
    sampleTechnology,
    sampleIds,
    sampleNames,
    sampleOptions,
    metadata: metadataField,
  };
};

module.exports = getGem2sParams;
