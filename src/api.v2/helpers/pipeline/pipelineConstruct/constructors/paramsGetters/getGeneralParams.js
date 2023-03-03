const config = require('../../../../../../config');

const getGeneralParams = (taskName, context) => {
  const {
    projectId, experimentId, processName,
  } = context;

  const remoterServer = (
    config.clusterEnv === 'development'
  ) ? 'host.docker.internal'
    : `remoter-server-${experimentId}.${config.pipelineNamespace}.svc.cluster.local`;

  const params = {
    projectId,
    experimentId,
    taskName,
    processName,
    server: remoterServer,
    ignoreSslCert: config.pipelineIgnoreSSLCertificate,
  };

  return params;
};

module.exports = getGeneralParams;
