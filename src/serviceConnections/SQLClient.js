const knex = require('knex');

const SQLClient = () => {
  const knexClient = knex.default({
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      // user: 'your_database_user',
      // password: '',
      database: 'myapp_test',
    },
  });

  return knexClient;
};

export default SQLClient;
