const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const http = require('http');
const AWSXRay = require('aws-xray-sdk');
const _ = require('lodash');
const config = require('../config');
const { authenticationMiddlewareExpress } = require('../utils/authMiddlewares');


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
  app.use(bodyParser.json({ extended: false, limit: '10mb', parameterLimit: 300000 }));

  // Enable AWS XRay
  // eslint-disable-next-line global-require
  AWSXRay.captureHTTPsGlobal(require('http'));
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


  app.use(AWSXRay.express.openSegment(`API-${config.clusterEnv}-${config.sandboxId}`));

  app.use((req, res, next) => {
    res.set('X-Amzn-Trace-Id', `Root=${AWSXRay.getSegment().trace_id}`);
    AWSXRay.getSegment().addAnnotation('podName', config.podName);

    next();
  });

  // Authentication middleware.
  const authMw = await authenticationMiddlewareExpress(app);

  app.use(authMw);

  // This is a weird middleware, it reacts to the response successfully being sent.
  // It adds annotations to the segment after the response is sent. This is
  // because OpenApiValidator blocks further middlewares somehow.
  app.use((req, res, next) => {
    res.once('finish', () => {
      _.mapKeys(
        req.params,
        (value, key) => {
          const segment = AWSXRay.resolveSegment(req.segment);
          segment.addAnnotation(key, value);
        },
      );
    });

    next();
  });

  app.use(OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, '..', 'specs', 'api.yaml'),
    validateRequests: true,
    validateResponses: true,
    operationHandlers: path.join(__dirname, '..', 'api'),
  }));

  app.use((req, res, next) => {
    console.log('middleware here tooo');

    next();
  });


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
