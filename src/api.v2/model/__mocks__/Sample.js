const BasicModel = require('./BasicModel')();

const stub = {
  ...BasicModel,
};

const Sample = jest.fn().mockImplementation(() => stub);

module.exports = Sample;
