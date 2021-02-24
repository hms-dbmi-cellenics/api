
const k8s = require('@kubernetes/client-node');

const getBackendStatus = require('../../../src/api/general-services/backend-status');

describe('Get backend status path', () => {
  beforeEach(() => jest.resetModules());

  it('Returns up when the worker is up.', async () => {
    const kc = new k8s.KubeConfig();
    kc.makeApiClient(k8s.CoreV1Api).listNamespacedPod.mockImplementation(async () => ({
      body: {
        items: [{
          status: {
            phase: 'Running',
            containerStatuses: [
              {
                started: true,
                ready: true,
                restartCount: 0,
              },
              {
                started: true,
                ready: true,
                restartCount: 0,
              },
            ],
          },
        }],
      },
    }));


    const result = await getBackendStatus('sample-experiment');

    expect(result).toEqual({
      worker: {
        ready: true, restartCount: 0, started: true, status: 'Running',
      },
    });
  });

  it('Returns down when any of the containers is down.', async () => {
    const kc = new k8s.KubeConfig();
    kc.makeApiClient(k8s.CoreV1Api).listNamespacedPod.mockImplementation(async () => ({
      body: {
        items: [{
          status: {
            phase: 'Starting',
            containerStatuses: [
              {
                started: true,
                ready: false,
                restartCount: 0,
              },
              {
                started: true,
                ready: true,
                restartCount: 0,
              },
            ],
          },
        }],
      },
    }));


    const result = await getBackendStatus('sample-experiment');

    expect(result).toEqual({
      worker: {
        ready: false, restartCount: 0, started: true, status: 'Starting',
      },
    });
  });

  it('Returns the higher of the containers\' restart counts.', async () => {
    const kc = new k8s.KubeConfig();
    kc.makeApiClient(k8s.CoreV1Api).listNamespacedPod.mockImplementation(async () => ({
      body: {
        items: [{
          status: {
            phase: 'Starting',
            containerStatuses: [
              {
                started: true,
                ready: false,
                restartCount: 5,
              },
              {
                started: true,
                ready: true,
                restartCount: 7,
              },
            ],
          },
        }],
      },
    }));


    const result = await getBackendStatus('sample-experiment');

    expect(result).toEqual({
      worker: {
        ready: false, restartCount: 7, started: true, status: 'Starting',
      },
    });
  });
});
