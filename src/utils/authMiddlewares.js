// See details at https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
// for how JWT verification works with Cognito.

const AWSXRay = require('aws-xray-sdk');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const jwtExpress = require('express-jwt');
const jwkToPem = require('jwk-to-pem');
const util = require('util');

const config = require('../config');

const CacheSingleton = require('../cache');

const { CacheMissError } = require('../cache/cache-utils');
const { UnauthorizedError, UnauthenticatedError } = require('./responses');
const ExperimentService = require('../api/route-services/experiment');

const experimentService = new ExperimentService();

/**
 * Authentication middleware for Express. Returns a middleware that
 * can be used in the API to authenticate Cognito-issued JWTs.
 */
const authenticationMiddlewareExpress = async (app) => {
  app.set('keys', {});

  // This will be run outside a request context, so there is no X-Ray segment.
  // Disable tracing so we don't end up with errors logged into the console.
  AWSXRay.setContextMissingStrategy(() => { });
  const poolId = await config.awsUserPoolIdPromise;
  AWSXRay.setContextMissingStrategy('LOG_ERROR');

  return jwtExpress({
    // JWT tokens are susceptible for downgrade attacks if the algorithm used to sign
    // the token is not specified.
    // AWS only returns RS256 signed tokens so we explicitly specify this requirement.
    algorithms: ['RS256'],
    // We don't always need users to be authenticated to perform an action (e.g. a health check).
    // The authenticated claim, if successful, gets saved in the request under req.user,
    // so during authorization we can check if the user parameter is actually present.
    // If not, the user was not authenticated.
    credentialsRequired: false,
    // JWT tokens are JSON files that are signed using a key.
    // We need to make sure that the issuer in the token is correct:
    // we verify that the signed JWT includes our own user pool.
    issuer: `https://cognito-idp.${config.awsRegion}.amazonaws.com/${poolId}`,
    secret: (req, payload, done) => {
      const token = req.headers.authorization.split(' ')[1];
      const [jwtHeaderRaw] = token.split('.');
      // key ID that was used to sign the JWT
      const { kid } = JSON.parse(Buffer.from(jwtHeaderRaw, 'base64').toString('ascii'));

      // Get the issuer from the JWT claim.
      const { iss } = payload;

      if (!iss.endsWith(poolId)) {
        done('Issuer does not correspond to the correct environment.');
      }

      // If we have already seen the key this message was signed by,
      // return immediately.
      const existingPem = app.get('keys').kid;

      if (existingPem) {
        done(null, existingPem);
        return;
      }

      // Otherwise, find the appropriate key for the issuer.
      fetch(`${iss}/.well-known/jwks.json`).then((res) => res.json()).then(({ keys }) => {
        const secret = keys.find((key) => key.kid === kid);
        const pem = jwkToPem(secret);

        app.set('keys', { ...app.get('keys'), kid: pem });
        done(null, pem);
      });
    },
  });
};

/**
 * Authentication middleware for Socket.IO requests. Resolves with
 * the JWT claim if the authentication was successful, or rejects with
 * the error otherwise.
 *
 * @param {*} authHeader The bearer-encoded JWT token.
 * @returns Promise that resolves or rejects based on authentication status.
 */
const authenticationMiddlewareSocketIO = async (authHeader) => {
  const poolId = await config.awsUserPoolIdPromise;
  const cache = CacheSingleton.get();

  const issuer = `https://cognito-idp.${config.awsRegion}.amazonaws.com/${poolId}`;
  const token = authHeader.split(' ')[1];
  const jwtVerify = util.promisify(jwt.verify);

  const result = await jwtVerify(
    token,
    (header, callback) => {
      const { kid } = header;

      cache.get(kid)
        .then((pem) => callback(null, pem))
        .catch((e) => {
          if (!(e instanceof CacheMissError)) {
            throw e;
          }

          fetch(`${issuer}/.well-known/jwks.json`).then((res) => res.json()).then(({ keys }) => {
            const secret = keys.find((key) => key.kid === kid);
            const pem = jwkToPem(secret);

            cache.set(kid, pem, 3600 * 48);
            callback(null, pem);
          });
        });
    },
    {
      algorithms: ['RS256'],
      issuer,
    },
  );

  return result;
};

/**
 * General authorization middleware. Resolves with nothing on
 * successful authorization, or an exception on unauthorized access.
 *
 * @param {*} experimentId The ID of the experiment to check.
 * @param {*} claim The JWT claim identifying the user.
 * @returns Promise that resolves or rejects based on authorization status.
 * @throws {UnauthorizedError} Authorization failed.
 */
const authorize = async (experimentId, claim) => {
  const { 'cognito:username': userName, email } = claim;

  const {
    rbac_can_write: canWrite,
  } = await experimentService.getExperimentPermissions(experimentId);

  if (!canWrite) {
    throw new UnauthorizedError(`Experiment ${experimentId} cannot be accesed (malformed).`);
  }

  // If the logged in user has the permissions, forward request.
  if (canWrite.values.includes(userName)) {
    return true;
  }

  throw new UnauthorizedError(`User ${userName} (${email}) does not have access to experiment ${experimentId}.`);
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
    await authorize(req.params.experimentId, req.user);
    next();
    return;
  } catch (e) {
    next(e);
  }
};

module.exports = {
  authenticationMiddlewareExpress,
  authenticationMiddlewareSocketIO,
  expressAuthorizationMiddleware,
  authorize,
};
