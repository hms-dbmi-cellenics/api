const util = require('util');
const fs = require('fs').promises;
const tmp = require('tmp-promise');
const childProcess = require('child_process');
const fetch = require('node-fetch');
const YAML = require('yaml');
const { Downloader } = require('github-download-directory');
const jq = require('jq-web');
const AsyncLock = require('async-lock');
const config = require('../../../config');
const logger = require('../../../utils/logging');

const lockHelmUpdateKey = 'lockHelmUpdate';
const lockHelmUpdate = new AsyncLock();

const constructChartValues = async (service) => {
  const { workQueueName } = service;
  const { experimentId } = service.workRequest;
  const { clusterEnv, sandboxId } = config;

  const response = await fetch(
    config.workerInstanceConfigUrl,
    {
      method: 'GET',
    },
  );

  const txt = await response.text();
  const manifest = YAML.parseAllDocuments(txt);

  const cfg = {
    images: {
      python: jq.json(manifest, '..|objects|.python.image//empty'),
      r: jq.json(manifest, '..|objects|.r.image//empty'),
    },
    namespace: `worker-${sandboxId}`,
    experimentId,
    clusterEnv,
    workQueueName,
    sandboxId,
    storageSize: '10Gi',
  };

  return { cfg, sha: jq.json(manifest, '.. | objects | select(.metadata.name == "worker") | .spec.chart.ref') };
};

const helmUpdate = async (service) => {
  const { workerHash } = service;
  const HELM_BINARY = '/usr/local/bin/helm';
  const execFile = util.promisify(childProcess.execFile);

  // Download value template from Git repository. Fill in needed things.
  const { cfg, sha } = await constructChartValues(service);
  const { name } = tmp.fileSync();
  await fs.writeFile(name, YAML.stringify(cfg));

  // Download the chart from the worker repository.
  const custom = new Downloader({
    github: { auth: config.githubToken },
  });

  await custom.download(
    'biomage-ltd', 'worker', 'chart-instance',
    { sha },
  );


  // Attempt to deploy the worker.
  try {
    const params = `upgrade worker-${workerHash} chart-instance/ --namespace ${cfg.namespace} -f ${name} --install --atomic -o json`.split(' ');
    logger.log(`helm params: ${params}`);

    let { stdout: release } = await execFile(HELM_BINARY, params);
    release = JSON.parse(release);

    logger.log(`Worker instance ${release.name} successfully created.`);
  } catch (error) {
    logger.error('helm failed', error);
    if (!error.stderr) {
      throw error;
    }
    let params = `status worker-${workerHash} --namespace ${cfg.namespace}`.split(' ');
    logger.log(`helm params: ${params}`);
    const status = await execFile(HELM_BINARY, params);
    console.log(status);
    params = `history worker-${workerHash} --namespace ${cfg.namespace}`.split(' ');
    logger.log(`helm params: ${params}`);
    const history = await execFile(HELM_BINARY, params);
    console.log(history);

    if (
      error.stderr.includes('release: already exists')
      || error.stderr.includes('another operation (install/upgrade/rollback) is in progress')
    ) {
      logger.log('Worker instance is being created by another process, skipping...');
      return;
    }

    throw error;
  }
};

const createWorkerResources = async (service) => {
  const justWait = lockHelmUpdate.isBusy(lockHelmUpdateKey);
  if (justWait) {
    logger.log('Helm update command lock: waiting');
    await lockHelmUpdate.acquire(lockHelmUpdateKey, () => { logger.log('Helm update command lock: available'); });
  } else {
    await lockHelmUpdate.acquire(lockHelmUpdateKey, () => { helmUpdate(service); });
  }
};

module.exports = createWorkerResources;
