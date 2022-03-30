// See details at https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
// for how JWT verification works with Cognito.
const { UnauthorizedError, UnauthenticatedError } = require('../../utils/responses');

const userAccess = require('../model/userAccess');

/**
 * General authorization middleware. Resolves with nothing on
 * successful authorization, or an exception on unauthorized access.
 *
 * @param {*} userId The ID of the user to authorize.
 * @param {*} resource The resource the user is requesting (either the URL or 'sockets').
 * @param {*} method The HTTP method of the request (or null in the case of sockets)
 * @param {*} authResource Either the experimentId or the projectUuid
 * @param {*} authByExperiment if true => authResource is an experimentId, false => projectUuid
 * @returns Promise that resolves or rejects based on authorization status.
 * @throws {UnauthorizedError} Authorization failed.
 * TODO after SQL migration, projects will no longer exist so refactor this method
 * and remove authByExperiment
 */
const authorize = async (userId, resource, method, authResource, authByExperiment = true) => {
  // authResource is always experimentId in V2 because there is not project
  const experimentId = authResource;

  const granted = await userAccess.canAccessExperiment(
    userId,
    experimentId,
    resource,
    method,
  );

  if (granted) {
    return true;
  }

  throw new UnauthorizedError(`User ${userId} does not have access to ${authByExperiment ? 'experiment' : 'project'} ${authResource}.`);
};

/**
 * Wrapper for the general authorization middleware for use in Express.
 * Calls `authorize()` internally.
 */
const expressAuthorizationMiddleware = async (req, res, next) => {
  if (!req.user) {
    next(new UnauthenticatedError('The request does not contain an authentication token.'));
    return;
  }

  const authByExperiment = !!req.params.experimentId;
  const authResource = authByExperiment ? req.params.experimentId : req.params.projectUuid;

  try {
    await authorize(req.user.sub, req.url, req.method, authResource, authByExperiment);
    next();
  } catch (e) {
    next(e);
  }
};

const expressAuthenticationOnlyMiddleware = async (req, res, next) => {
  if (!req.user) {
    next(new UnauthenticatedError('The request does not contain an authentication token.'));
    return;
  }
  next();
};

module.exports = {
  expressAuthorizationMiddleware,
  expressAuthenticationOnlyMiddleware,
  authorize,
};
