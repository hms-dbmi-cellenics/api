// if a given job has either a defined cpus / memory value
// it will be run in AWS Batch instead of fargate because fargate
// does not support dynamically changing cpus / memory
const needsBatchJob = (cpus, mem) => cpus !== undefined || mem !== undefined;

module.exports = needsBatchJob;
