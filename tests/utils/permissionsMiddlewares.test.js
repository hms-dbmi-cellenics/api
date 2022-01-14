const AWSMock = require('aws-sdk-mock');
const AWS = require('../../src/utils/requireAWS');
const fake = require('../test-utils/constants');

const {
  getPathModule,
  permissionsMiddleware,
} = require('../../src/api/route-services/permissionsHelpers');


describe('Tests for permissions middlewares', () => {
  it(' getPathModule returns expected module for each path', () => {
    // data processing paths
    [
      `/experiments/${fake.EXPERIMENT_ID}/gem2s`,
      `/experiments/${fake.EXPERIMENT_ID}/pipelines`,
    ].forEach((path) => {
      const module = getPathModule(path);
      expect(module).toEqual('data-processing');
    });

    // data management paths
    [
      `/experiments/${fake.EXPERIMENT_ID}/processingConfig'`,
    ].forEach((path) => {
      const module = getPathModule(path);
      expect(module).toEqual('data-management');
    });

    // plots and tables paths
    [
      `/experiments/${fake.EXPERIMENT_ID}/plots-tables/${fake.PLOT_UUID}`,
    ].forEach((path) => {
      const module = getPathModule(path);
      expect(module).toEqual('plots-and-tables');
    });
  });
});
