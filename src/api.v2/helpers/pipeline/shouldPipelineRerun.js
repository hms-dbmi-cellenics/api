const _ = require('lodash');
const ExperimentExecution = require('../../model/ExperimentExecution');
const ExperimentParent = require('../../model/ExperimentParent');
const Sample = require('../../model/Sample');

const formatSamples = (rawSamples) => {
  const samplesObj = rawSamples.reduce(
    (acc, current) => {
      acc[current.id] = current;
      return acc;
    },
    {},
  );

  const { sampleTechnology, metadata } = rawSamples[0];
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

  // Handle S3 paths
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

  return {
    sampleTechnology,
    sampleIds,
    sampleNames,
    sampleOptions,
    metadata: metadataField,
    sampleS3Paths,
  };
};


const getPipelineParams = async (experimentId, rawSamples = undefined) => {
  if (await new ExperimentParent().isSubset(experimentId)) return null;

  const samples = rawSamples || await new Sample().getSamples(experimentId);

  if (samples.length === 0) return null;

  const {
    sampleTechnology,
    sampleIds,
    sampleNames,
    sampleOptions,
    metadata,
  } = formatSamples(samples);

  return {
    sampleTechnology,
    sampleIds,
    sampleNames,
    sampleOptions,
    metadata,
  };
};

const shouldPipelineRerun = async (experimentId, pipelineType) => {
  const execution = await new ExperimentExecution()
    .findOne({ experiment_id: experimentId, pipeline_type: pipelineType });

  if (execution === undefined) return true;
  const currentParams = await getPipelineParams(experimentId);

  return !_.isEqual(currentParams, execution.lastPipelineParams);
};

module.exports = shouldPipelineRerun;
module.exports.getPipelineParams = getPipelineParams;
module.exports.formatSamples = formatSamples;
