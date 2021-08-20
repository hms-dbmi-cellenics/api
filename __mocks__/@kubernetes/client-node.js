const k8s = jest.genMockFromModule('@kubernetes/client-node');
const logger = require('../../src/utils/logging');

const mockApi = {
  createNamespacedJob: jest.fn(() => {
    logger.debug('creating a fake namespace obj');
    return new Promise((resolve) => {
      resolve({
        status: 200,
      });
    });
  }),
  createNamespacedPersistentVolumeClaim: jest.fn(() => {
    logger.debug('creating a fake namespace obj');
    return new Promise((resolve) => {
      resolve({
        status: 200,
      });
    });
  }),
  listNamespacedPod: jest.fn(() => new Promise((resolve, reject) => {
    reject(new Error('This mock must be overwritten per test.'));
  })),
};

k8s.KubeConfig.mockImplementation(() => {
  logger.debug('mocking the constructor');
  return {
    loadFromDefault: jest.fn(),
    makeApiClient: jest.fn(() => mockApi),
  };
});

module.exports = k8s;
