const createFailedStep = (context, step) => ({
  ...step,
  Type: 'Fail',
});

module.exports = createFailedStep;
