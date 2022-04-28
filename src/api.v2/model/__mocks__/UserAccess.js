const BasicModel = require('./BasicModel')();

const stub = {
  createNewExperimentPermissions: jest.fn(),
  canAccessExperiment: jest.fn(),
  getExperimentUsers: jest.fn(),
  ...BasicModel,
};

const UserAccess = jest.fn().mockImplementation(() => stub);

module.exports = UserAccess;
