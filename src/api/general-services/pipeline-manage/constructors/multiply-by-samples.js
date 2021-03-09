const _ = require('lodash');

/* eslint-disable no-param-reassign */
const replaceSampleStrings = (sampleKey, object) => {
  const replacedSampleObject = _.transform(object, (acumObject, value, key) => {
    const newKey = key.replace('<sample_id>', sampleKey);

    if (_.isObject(value)) {
      const newValue = replaceSampleStrings(sampleKey, value);
      acumObject[newKey] = newValue;
      return;
    }

    if (!_.isString(value)) {
      acumObject[newKey] = value;
      return;
    }

    // If it is string
    const newValue = value.replace('<sample_id>', sampleKey);

    acumObject[newKey] = newValue;
  }, {});

  return replacedSampleObject;
};
/* eslint-enable no-param-reassign */

const multiplyBySamples = (context, step, args) => {
  const { sampleKeys } = context;
  const { constructor } = args;

  const clonedStep = { ...step, XConstructorArgs: undefined, XStepType: undefined };

  // R server in pipeline crashes when we send more than one in the branches
  const onlyOneSample = [sampleKeys[0]];

  const sampleBranches = onlyOneSample.map((sampleKey) => {
    const branchesSkeleton = step.Branches[0];

    let clonedBranches = _.cloneDeepWith(branchesSkeleton, (o) => {
      if (_.isObject(o) && o.XStepType) {
        return {
          ...constructor(context, o),
          XStepType: undefined,
          XConstructorArgs: undefined,
        };
      }
      return undefined;
    });

    clonedBranches = replaceSampleStrings(sampleKey, clonedBranches);

    return clonedBranches;
  });


  clonedStep.Branches = sampleBranches;

  return clonedStep;
};

module.exports = multiplyBySamples;
