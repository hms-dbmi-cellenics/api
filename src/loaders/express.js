const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const http = require('http');
const _ = require('lodash');
const config = require('../config');
const { authenticationMiddlewareExpress, checkAuthExpiredMiddleware } = require('../api.v2/middlewares/authMiddlewares');

module.exports = async (app) => {
  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');
  // Enable Cross Origin Resource Sharing to all origins by default

  app.use(cors({
    origin: config.corsOriginUrl,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH'],
    credentials: true,
    exposedHeaders: ['X-Amzn-Trace-Id'],
  }));

  // The custom limits are required so that SNS topics can submit work results
  // up to the size of the max SNS topic limit (256k), it defaults to 100kb.
  app.use(bodyParser.urlencoded({ extended: false, limit: '1mb', parameterLimit: 300000 }));
  app.use(bodyParser.text({ extended: false, limit: '1mb', parameterLimit: 300000 }));
  app.use(bodyParser.json({
    extended: false,
    limit: '50mb',
    parameterLimit: 300000,
    type: 'application/json',
  }));
  app.use(bodyParser.json({
    extended: false,
    limit: '50mb',
    parameterLimit: 300000,
    type: 'application/*+json',
  }));



  // Authentication middleware.
  const authMw = await authenticationMiddlewareExpress(app);

  app.use(authMw);

  app.use(checkAuthExpiredMiddleware);

  app.use(
    OpenApiValidator.middleware({
      apiSpec: path.join(__dirname, '..', 'specs', 'api.v2.yaml'),
      validateRequests: true,
      validateResponses: {
        onError: (error) => {
          console.log('Response body fails validation: ', error);
        },
      },
      operationHandlers: path.join(__dirname, '..', 'api.v2'),
    }),
  );

  // Custom error handler.
  app.use((err, req, res, next) => {
    console.error(`Error thrown in HTTP request (${req.method} ${req.path})`);
    console.error(Object.keys(req.body).length ? req.body : 'Empty body');
    console.error(err);

    // format errors
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });

    next(err);
  });


  // eslint-disable-next-line global-require
  const io = require('socket.io')({
    allowEIO3: true,
    cors: {
      origin: config.corsOriginUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 600000,
    transports: ['websocket'],
  });

  const server = http.createServer(app);
  const socketIo = io.listen(server);

  return {
    socketIo,
    app,
    server,
  };
};
