const BasicModel = require('./BasicModel')();

const stub = {
  getMetadataByExperimentIds: () => ([]),
  ...BasicModel,
};

const CellLevel = jest.fn().mockImplementation(() => stub);

module.exports = CellLevel;
