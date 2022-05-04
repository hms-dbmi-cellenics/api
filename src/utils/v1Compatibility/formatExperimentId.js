// Existing experimentId in S3 (v1) are MD5 hashes not UUIDs.
// They have the same number of alhpanum characters as UUIDs but no dashes
// To maintain compatibility with v1, we remove the dashes from UUIDs.
// This function should be removed once we have migrated to v2.

const formatExperimentId = (experimentId) => experimentId.replace(/-/g, '');

module.exports = formatExperimentId;
