const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const http = require('http');
const AWSXRay = require('aws-xray-sdk');
const config = require('../config');
const authorizeRequest = require('../utils/authorizeRequest');

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
    AWSXRay.getSegment().addMetadata('podName', config.podName);
    next();
  });

  const authenticationEnabled = false;
  if (authenticationEnabled) {
    app.use(async (req, res, next) => {
      let workRequest = [];
      if (!req.headers.authorization) {
        try {
          workRequest = JSON.parse(JSON.parse(req.body).Message).request;
        } catch (err) {
          return res.status(403).json({ error: 'No credentials sent!' });
        }
      }
      const bearerHeader = req.headers.authorization
      || workRequest.extraHeaders.Authorization;

      const url = req.url.split('/');
      const experimentId = workRequest.experimentId || url[url.indexOf('experiments') + 1];
      const bearerToken = bearerHeader.split(' ')[1];
      const isAuthorized = await authorizeRequest(experimentId, bearerToken);

      if (!isAuthorized) {
        return res.status(403).json({ error: 'User is not authorized!' });
      }
      next();
      return res.status(200);
    });
  }

  app.use(OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, '..', 'specs', 'api.yaml'),
    validateRequests: true,
    validateResponses: true,
    operationHandlers: path.join(__dirname, '..', 'api'),
  }));

  // Custom error handler.
  // eslint-disable-next-line no-unused-vars


  app.use((err, req, res, next) => {
    console.error('Error thrown in HTTP request');
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
  });

  const server = http.createServer(app);
  const socketIo = io.listen(server);

  return {
    socketIo,
    app,
    server,
  };
};
