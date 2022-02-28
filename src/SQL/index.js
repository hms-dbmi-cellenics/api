const knex = require('knex');

const env = process.env.NODE_ENV || 'development';
const knexfile = require('./knexfile');

const SQLClient = knex.default(knexfile[env]);

module.exports = SQLClient;
