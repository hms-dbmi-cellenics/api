const getAvailablePods = require('./getAvailablePods');
const asyncTimer = require('./asyncTimer');
const getLogger = require('./getLogger');

const logger = getLogger();

const waitForPods = async (namespace, kc, maxWaitMs = 60000, pollIntervalMs = 1000) => {
  let pods = await getAvailablePods(namespace, kc);
  const maxTries = Math.ceil(maxWaitMs / pollIntervalMs);
  for (let i = 0; pods.length < 1 && i < maxTries; i += 1) {
    logger.log('No available worker pods, waiting...');
    // eslint-disable-next-line no-await-in-loop
    await asyncTimer(pollIntervalMs);
    pods = await getAvailablePods(namespace, kc);
  }
  return pods;
};

module.exports = waitForPods;
