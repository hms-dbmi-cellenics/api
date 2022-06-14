// See details at https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
// for how JWT verification works with Cognito.
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

const AWSXRay = require('aws-xray-sdk');

const { promisify } = require('util');

const config = require('../../config');

const CacheSingleton = require('../../cache');
const { CacheMissError } = require('../../cache/cache-utils');

const { UnauthorizedError, UnauthenticatedError } = require('../../utils/responses');

const UserAccess = require('../model/UserAccess');

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

  const granted = await new UserAccess().canAccessExperiment(
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

/**
 * Authentication middleware for Socket.IO requests. Resolves with
 * the JWT claim if the authentication was successful, or rejects with
 * the error otherwise.
 * If ignoreExpiration is set to true, jwt.verify will not return an error
 * for expired tokens.
 *
 * @param {*} authHeader The bearer-encoded JWT token.
 * @returns Promise that resolves or rejects based on authentication status.
 */
const authenticationMiddlewareSocketIO = async (authHeader, ignoreExpiration = false) => {
  const poolId = await config.awsUserPoolIdPromise;
  const cache = CacheSingleton.get();

  const issuer = `https://cognito-idp.${config.awsRegion}.amazonaws.com/${poolId}`;
  const token = authHeader.split(' ')[1];
  const jwtVerify = promisify(jwt.verify);

  const result = await jwtVerify(
    token,
    (header, callback) => {
      const { kid } = header;

      cache.get(kid)
        .then(({ pem }) => callback(null, pem))
        .catch((e) => {
          if (!(e instanceof CacheMissError)) {
            throw e;
          }

          fetch(`${issuer}/.well-known/jwks.json`).then((res) => res.json()).then(({ keys }) => {
            const secret = keys.find((key) => key.kid === kid);
            const pem = jwkToPem(secret);

            cache.set(kid, { pem }, 3600 * 48);
            callback(null, pem);
          });
        });
    },
    {
      ignoreExpiration,
      algorithms: ['RS256'],
      issuer,
    },
  );
  AWSXRay.getSegment().setUser(result.sub);
  return result;
};

module.exports = {
  expressAuthorizationMiddleware,
  expressAuthenticationOnlyMiddleware,
  authenticationMiddlewareSocketIO,
  authorize,
};
