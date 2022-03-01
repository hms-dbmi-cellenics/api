/* eslint-disable global-require */

let config;

if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
  config = require('./testConfig');
} else {
  config = require('./defaultConfig');
}

module.exports = config;
