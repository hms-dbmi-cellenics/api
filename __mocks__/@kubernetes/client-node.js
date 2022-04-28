const k8s = jest.genMockFromModule('@kubernetes/client-node');

const mockApi = {
  createNamespacedJob: jest.fn(() => {
    console.debug('creating a fake namespace obj');
    return new Promise((resolve) => {
      resolve({
        status: 200,
      });
    });
  }),
  createNamespacedPersistentVolumeClaim: jest.fn(() => {
    console.debug('creating a fake namespace obj');
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

k8s.KubeConfig.mockImplementation(() => ({
  loadFromDefault: jest.fn(),
  makeApiClient: jest.fn(() => mockApi),
}));

module.exports = k8s;
