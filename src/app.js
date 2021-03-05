/* eslint-disable no-console */
require('log-timestamp');
const express = require('express');
const expressLoader = require('./loaders/express');
const cacheLoader = require('./loaders/cache');
const config = require('./config');
const logger = require('./utils/logging');

async function startServer() {
  const { app, server, socketIo: io } = await expressLoader(express());
  await cacheLoader(io);

  app.set('io', io);

  // Set up handlers for SocketIO events.
  io.on('connection', (socket) => {
    logger.log(`Client with socket ID ${socket.id} successsfully connected.`);
    // eslint-disable-next-line global-require
    require('./api/events')(socket);
  });

  // Set up HTTP server.
  server.listen(config.port, (err) => {
    if (err) {
      process.exit(1);
    }

    logger.log(`NODE_ENV: ${process.env.NODE_ENV}, cluster env: ${config.clusterEnv}`);
    logger.log(`Server listening on port: ${config.port}`);
  });
}

startServer();
