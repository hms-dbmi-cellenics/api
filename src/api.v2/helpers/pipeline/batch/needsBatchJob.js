const needsBatchJob = (cpus, mem) => cpus !== undefined || mem !== undefined;

module.exports = needsBatchJob;
