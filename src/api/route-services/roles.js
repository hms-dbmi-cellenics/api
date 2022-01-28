const OWNER = 'owner';
const ADMIN = 'admin';
const EXPLORER = 'explorer';
const VIEWER = 'viewer';

// allowedResources contains which resources each roles is allowed to modify (read-write)
// all the resources are viewable by default by all roles
const allowedResources = {
  [OWNER]: [
    '.*',
  ],
  [ADMIN]: [
    '.*',
  ],
  [EXPLORER]: [
    'socket',
    '/experiments/(?<experimentId>.*)/plots-tables/(?<plotUuid>.*)',
    '/experiments/(?<experimentId>.*)/cellSets',
  ],
};
const isRoleAuthorized = (role, resource, method) => {
  // if no role is provided, return not authorized
  if (!role) {
    return false;
  }
  // all roles have view permissions by default
  if (method === 'GET') {
    return true;
  }

  // if we are here, it means we are seeking write permissions, try to see if
  // the roles' allowed resources match the requested resource
  if (allowedResources[role].some((regex) => resource.match(regex))) {
    return true;
  }

  return false;
};

module.exports = {
  OWNER, ADMIN, EXPLORER, VIEWER, isRoleAuthorized,
};
