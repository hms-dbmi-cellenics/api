const BasicModel = require('./BasicModel')();

const stub = {
  getMetadataByExperimentIds: () => ([]),
  ...BasicModel,
};

const CellLevelMeta = jest.fn().mockImplementation(() => stub);

module.exports = CellLevelMeta;
