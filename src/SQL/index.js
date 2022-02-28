const knex = require('knex');
const config = require('../config');

const knexfile = require('./knexfile');

const SQLClient = knex.default(knexfile[config.clusterEnv]);

module.exports = SQLClient;
