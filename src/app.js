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

    const debugPath = process.env.DEBUG_PATH;
    const debugStep = process.env.DEBUG_STEP;

    logger.log(`NODE_ENV: ${process.env.NODE_ENV}, cluster env: ${config.clusterEnv}`);
    logger.log(`Server listening on port: ${config.port}`);
    logger.log(`⚠️ DEBUG_STEP: ${debugStep}`);
    logger.log(`⚠️ DEBUG_PATH: ${debugPath}`);

    if (debugStep !== '' && typeof debugPath === 'undefined') {
      logger.log('⚠️ DEBUG_PATH (where to save locally) required when specifying DEBUG_STEP');
    }
  });
}

startServer();
