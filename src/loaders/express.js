const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const http = require('http');
const AWSXRay = require('aws-xray-sdk');
const _ = require('lodash');
const config = require('../config');
const { authenticationMiddlewareExpress, checkAuthExpiredMiddleware } = require('../utils/authMiddlewares');

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
    limit: '10mb',
    parameterLimit: 300000,
    type: 'application/json',
  }));
  app.use(bodyParser.json({
    extended: false,
    limit: '10mb',
    parameterLimit: 300000,
    type: 'application/*+json',
  }));

  // Enable AWS XRay
  // eslint-disable-next-line global-require
  AWSXRay.captureHTTPsGlobal(require('http'));
  AWSXRay.setLogger({
    error: () => { /* logging code */ },
    warn: () => { /* logging code */ },
    info: () => { /* logging code */ },
    debug: () => { /* logging code */ },
  });
  AWSXRay.setContextMissingStrategy('LOG_ERROR');

  AWSXRay.middleware.setSamplingRules({
    rules: [
      {
        description: 'Health check',
        http_method: '*',
        host: '*',
        url_path: '/v1/health',
        fixed_target: 0,
        rate: 0.0,
      },
    ],
    default: {
      fixed_target: 10,
      rate: 0.05,
    },
    version: 2,
  });


  /**
   * This middleware must be instantiated before the X-Ray middleware
   * opens the segment. This adds a hook to run when `res` is sent to the
   * client so we can add all necessary path parameters as annotations. Event
   * handlers are executed in order, so this must happen before AWS can add
   * its own hook.
   */
  app.use((req, res, next) => {
    res.once('finish', () => {
      const segment = AWSXRay.resolveSegment(req.segment);

      if (segment) {
        _.mapKeys(
          req.params,
          (value, key) => {
            AWSXRay.getSegment().addAnnotation(key, value);
          },
        );
      }
    });

    next();
  });

  app.use(AWSXRay.express.openSegment(`API-${config.clusterEnv}-${config.sandboxId}`));

  app.use((req, res, next) => {
    res.set('X-Amzn-Trace-Id', `Root=${AWSXRay.getSegment().trace_id}`);
    AWSXRay.getSegment().addMetadata('request', JSON.stringify(req.body));
    AWSXRay.getSegment().addMetadata('headers', JSON.stringify(req.headers));
    AWSXRay.getSegment().addAnnotation('podName', config.podName);
    AWSXRay.getSegment().addAnnotation('sandboxId', config.sandboxId);
    next();
  });

  // Authentication middleware.
  const authMw = await authenticationMiddlewareExpress(app);

  app.use(authMw);

  app.use(checkAuthExpiredMiddleware);

  app.use(OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, '..', 'specs', 'api.yaml'),
    validateRequests: true,
    validateResponses: {
      onError: (error) => {
        console.log('Response body fails validation: ', error);

        AWSXRay.getSegment().addMetadata('openApiValidationError', JSON.stringify(error));
        AWSXRay.getSegment().addAnnotation('openApiValidationFailed', true);
      },
    },
    operationHandlers: path.join(__dirname, '..', 'api'),
  }));

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

  app.use(AWSXRay.express.closeSegment());

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
