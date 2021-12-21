// See details at https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
// for how JWT verification works with Cognito.
// const promiseAny = require('promise.any');

// const AWSXRay = require('aws-xray-sdk');
// const fetch = require('node-fetch');
// const jwt = require('jsonwebtoken');
// const jwtExpress = require('express-jwt');
// const jwkToPem = require('jwk-to-pem');
// const util = require('util');
// const dns = require('dns').promises;

// const config = require('../config');

// const CacheSingleton = require('../cache');

// const { CacheMissError } = require('../cache/cache-utils');
// const { UnauthorizedError, UnauthenticatedError } = require('./responses');
// const ExperimentService = require('../api/route-services/experiment');
// const ProjectsService = require('../api/route-services/projects');

// const experimentService = new ExperimentService();
// const projectService = new ProjectsService();

const DATA_MANAGEMENT = 'data-management';
const DATA_PROCESSING = 'data-processing';
const DATA_EXPLORATION = 'data-exploration';
const PLOTS_AND_TABLES = 'plots-and-tables';
const permissionTypes = [DATA_MANAGEMENT, DATA_PROCESSING, DATA_EXPLORATION, PLOTS_AND_TABLES];

const UUID_REGEX = '\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b';

const READ = 'r';
const WRITE = 'rw';
// ordered in reverse from most restrictive to least restrictive
// plots and tables paths are a subset of data management so they
// won't be matched if they are last
const moduleRegexes = {
  [PLOTS_AND_TABLES]: [
    '/experiments/(?<experimentId>.*)/plots-tables/(?<plotUuid>.*)',
  ],
  [DATA_PROCESSING]: [
    '/experiments/(?<experimentId>.*)/gem2s',
    '/experiments/(?<experimentId>.*)/pipelines',
  ],
  [DATA_MANAGEMENT]: [
    '/experiments/(?<experimentId>.*)',
    '/experiments/(?<experimentId>.*)/cellSets',
    '/experiments/(?<experimentId>.*)/processingConfig',
    '/experiments/(?<experimentId>.*)/download/{type}',
    '/experiments/(?<experimentId>.*)/backendStatus',
    '/experiments/(?<experimentId>.*)/samples',
    '/projects/(?<projectUuid>.*)',
    '/projects/(?<projectUuid>.*)/experiments',
    '/projects/(?<projectUuid>.*)/samples',
    '/projects/(?<projectUuid>.*)/(?<experimentId>.*)/samples',
    '/projects/(?<projectUuid>.*)/samples/(?<sampleUuid>.*)/(?<fileName>.*)/uploadUrl',
    '/projects/(?<projectUuid>.*)/samples/(?<sampleUuid>.*)/(?<fileName>.*)/downloadUrl',
    '/projects',
  ],

};

const getModuleOf = (path) => {
  if (path.match(moduleRegexes[PLOTS_AND_TABLES])) {
    return PLOTS_AND_TABLES;
  }

  if (moduleRegexes[DATA_PROCESSING].some((regex) => path.match(regex))) {
    return DATA_PROCESSING;
  }

  if (moduleRegexes[DATA_MANAGEMENT].some((regex) => path.match(regex))) {
    return DATA_MANAGEMENT;
  }

  return '*';
};

const getPermissionsFor = (method) => {
  if (method === 'GET') {
    return READ;
  }
  return WRITE;
};

// const userHasPermissions = (userId, module, method) => {
//   // const userPermissions = getUserPermissions(userId);
//   console.log('xx');
//   return true;
// };

// const permissionsMiddleware = (req, res, next) => {
//   const module = getPathModule(req.url);
//   const userId = req.user.sub;
//   const mode = permissionRequested(req.method);

//   if (!userHasPermissions(userId, module, mode)) {
//     console.log(`forbidding req ${req.url} ${req.method}`);
//     console.log();
//     res.sendStatus(403);
//   }
//   next();
// };

// Misc - User related
// /health
//   get
// /kubernetesEvents
//   post
// // Data received from infra (pipelines / worker)
// /gem2sResults
//   post
// /pipelineResults
//   post
// // Data management
// '/experiments/(?<experimentId>.*)'
//   get
//   post
//   put
// '/experiments/(?<experimentId>.*)/cellSets'
//   get
//   put
//   patch
// '/experiments/(?<experimentId>.*)/processingConfig'
//   get
//   put
// '/experiments/(?<experimentId>.*)/download/{type}'
//   get
// '/experiments/(?<experimentId>.*)/backendStatus'
//   get
// '/experiments/(?<experimentId>.*)/samples'
//   get
// '/projects/(?<projectUuid>.*)'
//   post
//   put
//   delete
// '/projects/(?<projectUuid>.*)/experiments'
//   get
// '/projects/(?<projectUuid>.*)/samples'
//   get
// '/projects/(?<projectUuid>.*)/(?<experimentId>.*)/samples'
//   put
//   post
//   delete
// '/projects/(?<projectUuid>.*)/samples/(?<sampleUuid>.*)/(?<fileName>.*)/uploadUrl'
//   get
// '/projects/(?<projectUuid>.*)/samples/(?<sampleUuid>.*)/(?<fileName>.*)/downloadUrl'
//   get
// /projects
//   get
// // Data Processing
// '/experiments/(?<experimentId>.*)/gem2s'
//   post
// '/experiments/(?<experimentId>.*)/pipelines'
//   post
// // Data Exploration
// // data exploration is going to be trickier because now the UI fetches the results from S3 directly so any API
// // won't be able to intercept those requests.
// // Plots and tables
// '/experiments/(?<experimentId>.*)/plots-tables/(?<plotUuid>.*)'
//   put
//   get
//   delete


module.exports = {
  getModuleOf,
  getPermissionsFor,
  // permissionsMiddleware,
};
