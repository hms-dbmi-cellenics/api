const _ = require('lodash');
const ExperimentExecution = require('../../model/ExperimentExecution');
const ExperimentParent = require('../../model/ExperimentParent');
const Sample = require('../../model/Sample');

const getGem2sParams = async (experimentId, returnSampleFileS3Paths = false) => {
  if (await new ExperimentParent().isSubset(experimentId)) return { gem2sParams: null };

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
  const defaultMetadata = 'N.A.';
  const metadataInvariant = Object.keys(metadata).sort();
  const metadataField = metadataInvariant.reduce(
    (acc, current) => {
      // Make sure the key does not contain '-' as it will cause failure in GEM2S
      const sanitizedKey = current.replace(/-+/g, '_');

      const entries = sampleIds.map((id) => samplesObj[id].metadata[current] || defaultMetadata);
      acc[sanitizedKey] = entries;
      return acc;
    },
    {},
  );

  const gem2sParams = {
    sampleTechnology,
    sampleIds,
    sampleNames,
    sampleOptions,
    metadata: metadataField,
  };

  // Handle S3 Paths
  if (!returnSampleFileS3Paths) {
    return { gem2sParams };
  }

  // Below reducers achieve the following:
  // {
  //   sampleId: {
  //     matrix10x: ...,
  //     barcodes10x: ...,
  //     features10x: ...,
  //   }
  //   ...
  // }
  const sampleS3Paths = sampleIds.reduce((sampleAcc, id) => {
    const s3Path = Object.entries(samplesObj[id].files).reduce((fileAcc, [filename, body]) => ({
      ...fileAcc,
      [filename]: body.s3Path,
    }), {});

    return {
      ...sampleAcc,
      [id]: s3Path,
    };
  }, {});

  return { gem2sParams, sampleS3Paths };
};

const shouldGem2sRerun = async (experimentId) => {
  const execution = await new ExperimentExecution().findOne({ experiment_id: experimentId, pipeline_type: 'gem2s' });
  if (execution === undefined) return true;
  const { gem2sParams: currentParams } = await getGem2sParams(experimentId);
  return !_.isEqual(currentParams, execution.lastGem2SParams);
};

module.exports = shouldGem2sRerun;
module.exports.getGem2sParams = getGem2sParams;
