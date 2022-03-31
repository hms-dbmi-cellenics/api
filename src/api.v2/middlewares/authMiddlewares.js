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
 * @param {*} experimentId Either the experimentId or the projectUuid
 * @returns Promise that resolves or rejects based on authorization status.
 * @throws {UnauthorizedError} Authorization failed.
 * TODO after SQL migration, projects will no longer exist so refactor this method
 * and remove authByExperiment
 */
const authorize = async (userId, resource, method, experimentId) => {
  // authResource is always experimentId in V2 because there is no project

  const granted = await userAccess.canAccessExperiment(
    userId,
    experimentId,
    resource,
    method,
  );

  if (granted) {
    return true;
  }

  throw new UnauthorizedError(`User ${userId} does not have access to experiment ${experimentId}.`);
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

  try {
    await authorize(req.user.sub, req.url, req.method, req.params.experimentId);
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
