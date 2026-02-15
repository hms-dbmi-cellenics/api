const asyncTimer = require('../../../../utils/asyncTimer');
const getLogger = require('../../../../utils/getLogger');
const getAvailablePods = require('../../pipeline/hooks/getAvailablePods');

const logger = getLogger();

const waitForPods = async (namespace, maxTries = 20, currentTry = 0) => {
  logger.log('Waiting for pods...');
  await asyncTimer(1000);
  const pods = await getAvailablePods(namespace);

  if (pods.length > 0 || currentTry >= maxTries) {
    return;
  }

  await waitForPods(namespace, maxTries, currentTry + 1);
};

module.exports = waitForPods;
