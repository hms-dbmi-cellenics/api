const getWorkerStatus = require('./getWorkerStatus');

/**
 * Waits for the worker to become ready, polling every intervalMs, up to timeoutMs.
 * @param {string} experimentId
 * @param {number} timeoutMs
 * @param {number} intervalMs
 * @returns {Promise<'ready'|'timeout'>}
 */
async function waitForWorkerReady(experimentId, timeoutMs = 120000, intervalMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const status = await getWorkerStatus(experimentId);
    if (status.worker && status.worker.ready) {
      return 'ready';
    }
    const elapsedMs = Date.now() - start;
    const remainingMs = timeoutMs - elapsedMs;
    if (remainingMs <= 0) {
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, remainingMs)));
  }
  return 'timeout';
}

module.exports = waitForWorkerReady;
