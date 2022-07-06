const BasicModel = require('./BasicModel')();

const stub = {
  getExperimentUsers: jest.fn(),
  addToInviteAccess: jest.fn(),
  registerNewUserAccess: jest.fn(),
  grantAccess: jest.fn(),
  removeAccess: jest.fn(),
  createNewExperimentPermissions: jest.fn(),
  canAccessExperiment: jest.fn(),
  ...BasicModel,
};

const UserAccess = jest.fn().mockImplementation(() => stub);

module.exports = UserAccess;
