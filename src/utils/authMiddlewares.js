// See details at https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
// for how JWT verification works with Cognito.

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const jwtExpress = require('express-jwt');
const jwkToPem = require('jwk-to-pem');
const util = require('util');
const config = require('../config');
const CacheSingleton = require('../cache');
const { CacheMissError } = require('../cache/cache-utils');
const { UnauthorizedError, UnauthenticedError } = require('./errors');
const ExperimentService = require('../api/route-services/experiment');

const experimentService = new ExperimentService();

const authenticationMiddlewareExpress = async (app) => {
  app.set('keys', {});
  const poolId = await config.awsUserPoolIdPromise;

  return jwtExpress({
    algorithms: ['RS256'],
    credentialsRequired: false,
    issuer: `https://cognito-idp.${config.awsRegion}.amazonaws.com/${poolId}`,
    secret: (req, payload, done) => {
      const token = req.headers.authorization.split(' ')[1];
      const [jwtHeaderRaw] = token.split('.');
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

const authorizationMiddleware = async (req, res, next) => {
  if (!req.user) {
    next(new UnauthenticedError('The request does not contain an authentication token.'));
    return;
  }

  const { 'cognito:username': userName, email } = req.user;

  const { experimentId } = req.params;
  const {
    rbac_can_write: canWrite,
  } = await experimentService.getExperimentPermissions(experimentId);

  // If the logged in user has the permissions, forward request.
  if (canWrite.includes(userName)) {
    next();
    return;
  }

  next(new UnauthorizedError(`User ${userName} (${email}) does not have access to experiment ${experimentId}.`));
};

module.exports = {
  authenticationMiddlewareExpress,
  authenticationMiddlewareSocketIO,
  authorizationMiddleware,
};
