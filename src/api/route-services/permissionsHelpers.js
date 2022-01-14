const { MODULE_NAMES: mn, PERMISSIONS: perm } = require('./permissionsConstants');

// ordered in reverse from most restrictive to least restrictive
// plots and tables paths are a subset of data management so they
// won't be matched if they are last
const moduleRegexes = {
  [mn.PLOTS_AND_TABLES]: [
    '/experiments/(?<experimentId>.*)/plots-tables/(?<plotUuid>.*)',
  ],
  [mn.DATA_PROCESSING]: [
    '/experiments/(?<experimentId>.*)/gem2s',
    '/experiments/(?<experimentId>.*)/pipelines',
  ],
  // many of these are needed to display plots & tables or data exploration; consider
  // whether we need a data-management permission or it can just be implicitly granted
  // whenver the user has data-processing | exploration | plots & tables
  [mn.DATA_MANAGEMENT]: [
    '/experiments/(?<experimentId>.*)',
    '/experiments/(?<experimentId>.*)/cellSets',
    '/experiments/(?<experimentId>.*)/processingConfig',
    '/experiments/(?<experimentId>.*)/download/{type}',
    '/experiments/(?<experimentId>.*)/backendStatus',
    '/experiments/(?<experimentId>.*)/samples', // [GET]
    '/projects/(?<projectUuid>.*)',
    '/projects/(?<projectUuid>.*)/experiments',
    '/projects/(?<projectUuid>.*)/samples', // [GET]
    '/projects/(?<projectUuid>.*)/(?<experimentId>.*)/samples', // [PUT, POST, DELETE]
    '/projects/(?<projectUuid>.*)/samples/(?<sampleUuid>.*)/(?<fileName>.*)/uploadUrl', // probably write
    '/projects/(?<projectUuid>.*)/samples/(?<sampleUuid>.*)/(?<fileName>.*)/downloadUrl', // probably read
    '/projects',
  ],
};

const getModuleOf = (path) => {
  if (path.match(moduleRegexes[mn.PLOTS_AND_TABLES])) {
    return mn.PLOTS_AND_TABLES;
  }

  if (moduleRegexes[mn.DATA_PROCESSING].some((regex) => path.match(regex))) {
    return mn.DATA_PROCESSING;
  }

  if (moduleRegexes[mn.DATA_MANAGEMENT].some((regex) => path.match(regex))) {
    return mn.DATA_MANAGEMENT;
  }

  return '*';
};

const getPermissionsFor = (method) => {
  if (method === 'GET') { // maybe add LIST
    return perm.READ;
  }
  return perm.READ_WRITE;
};


module.exports = {
  getModuleOf,
  getPermissionsFor,
  // permissionsMiddleware,
};
