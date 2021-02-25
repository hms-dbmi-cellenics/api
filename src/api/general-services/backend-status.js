const k8s = require('@kubernetes/client-node');
const crypto = require('crypto');
const config = require('../../config');


const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const getBackendStatus = async (experimentId) => {
  const response = {
    worker: {
      status: 'NotLaunched',
      started: false,
      ready: false,
      restartCount: 0,
    },
  };

  // This will not work in development as we are not in a cluster.
  // Always show the worker as 'up'.
  if (config.clusterEnv === 'development') {
    return {
      ...response,
      worker: {
        ...response.worker,
        status: 'Running',
        started: true,
        ready: true,
      },
    };
  }

  const workerHash = crypto
    .createHash('sha1')
    .update(`${experimentId}-${config.sandboxId}`)
    .digest('hex');

  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  // Get worker status
  const podList = await coreApi.listNamespacedPod(
    `worker-${config.sandboxId}`,
    undefined, undefined, undefined, undefined,
    `job-name=worker-${workerHash}-job`,
  );

  const workerDetails = podList.body.items[0];

  if (!workerDetails) {
    return response;
  }

  response.worker.status = workerDetails.status.phase;

  let containerStatus = {};

  if (workerDetails.status.containerStatuses.length >= 0) {
    containerStatus = workerDetails.status.containerStatuses.reduce((accumulator, current) => ({
      ...accumulator,
      started: accumulator.started && current.started,
      ready: accumulator.ready && current.ready,
      restartCount: Math.max(accumulator.restartCount, current.restartCount),
    }), {
      started: true,
      ready: true,
      restartCount: -111,
    });
  }

  return {
    ...response,
    worker: {
      ...response.worker,
      ...containerStatus,
    },
  };
};

module.exports = getBackendStatus;
