// See details at https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
// for how JWT verification works with Cognito.
const promiseAny = require('promise.any');

const AWSXRay = require('aws-xray-sdk');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const jwtExpress = require('express-jwt');
const jwkToPem = require('jwk-to-pem');
const util = require('util');
const dns = require('dns').promises;

const config = require('../config');

const CacheSingleton = require('../cache');

const { CacheMissError } = require('../cache/cache-utils');
const { UnauthorizedError, UnauthenticatedError } = require('./responses');
const ProjectsService = require('../api/route-services/projects');
const AccessService = require('../api/route-services/access');

const accessService = new AccessService();
const projectService = new ProjectsService();

/**
 * Authentication middleware for Express. Returns a middleware that
 * can be used in the API to authenticate Cognito-issued JWTs.
 */
const authenticationMiddlewareExpress = async (app) => {
  app.set('keys', {});

  // This will be run outside a request context, so there is no X-Ray segment.
  // Disable tracing so we don't end up with errors logged into the console.
  const poolId = await config.awsUserPoolIdPromise;

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
    ignoreExpiration: true,
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
      const { iss, sub } = payload;

      AWSXRay.getSegment().setUser(sub);

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


// eslint-disable-next-line no-useless-escape
const INTERNAL_DOMAINS_REGEX = new RegExp('((\.compute\.internal)|(\.svc\.local))$');

const checkAuthExpiredMiddleware = (req, res, next) => {
  const isReqFromLocalhost = async () => {
    const ip = req.connection.remoteAddress;
    const host = req.get('host');

    if (ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === '::1' || host.indexOf('localhost') !== -1) {
      return true;
    }

    throw new Error('ip address is not localhost');
  };

  const isReqFromCluster = async () => {
    const domains = await dns.reverse(req.ip);

    if (!domains.some((domain) => INTERNAL_DOMAINS_REGEX.test(domain))) {
      throw new Error('ip address does not come from internal sources');
    }

    return true;
  };

  if (!req.user) {
    return next();
  }

  // JWT `exp` returns seconds since UNIX epoch, conver to milliseconds for this
  const timeLeft = (req.user.exp * 1000) - Date.now();

  // ignore if JWT is still valid
  if (timeLeft > 0) {
    return next();
  }

  // send error if JWT is older than the limit
  if (timeLeft < -(7 * 1000 * 60 * 60)) {
    return next(new UnauthenticatedError('token has expired'));
  }

  console.log(`lcs checking ignore [${req.url}] [${req.method.toLowerCase()}]`);
  // check if we should ignore expired jwt token for this path and request type
  const longTimeoutEndpoints = [{ urlMatcher: /^\/v1\/experiments\/.{32}\/cellSets$/, method: 'PATCH' }];
  const isEndpointIgnored = longTimeoutEndpoints.some(
    ({ urlMatcher, method }) => (
      req.method.toLowerCase() === method.toLowerCase() && urlMatcher.test(req.url)
    ),
  );

  console.log('isEndpointIgnored: ', isEndpointIgnored);
  // if endpoint is not in ignore list, the JWT is too old, send an error accordingly
  if (!isEndpointIgnored) {
    return next(new UnauthenticatedError('token has expired'));
  }

  promiseAny([isReqFromCluster(), isReqFromLocalhost()])
    .then(() => {
      next();
    })
    .catch(() => {
      next(new UnauthenticatedError('token has expired'));
    });

  return null;
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
  const jwtVerify = util.promisify(jwt.verify);

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
  let experimentId = authResource;
  if (!authByExperiment) {
    const experiments = await projectService.getExperiments(authResource);
    experimentId = experiments[0].experimentId;
  }

  const granted = await accessService.canAccessExperiment(userId,
    experimentId,
    resource,
    method);

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
  authenticationMiddlewareExpress,
  authenticationMiddlewareSocketIO,
  expressAuthorizationMiddleware,
  expressAuthenticationOnlyMiddleware,
  checkAuthExpiredMiddleware,
  authorize,
};
