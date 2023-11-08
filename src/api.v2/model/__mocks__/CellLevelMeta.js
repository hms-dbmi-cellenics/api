const BasicModel = require('./BasicModel')();

const stub = {
  getMetadataByExperimentIds: jest.fn(),
  ...BasicModel,
};
const CellLevelMeta = jest.fn().mockImplementation(() => stub);

module.exports = CellLevelMeta;
