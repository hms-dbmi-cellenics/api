// const ExperimentService = require('../api/route-services/experiment');
const jwt = require('express-jwt');
const jwkToPem = require('jwk-to-pem');
const config = require('../config');


// const authorizationMiddleware = async

// const authorizeRequest = async (experimentId, userId) => {
//   const experiment = new ExperimentService();
//   const data = await experiment.getExperimentPermissions(experimentId);
//   if (data.can_write.includes(userId)) {
//     return true;
//   }
//   return false;
// };

/*
  const userPoolClientId = UserPoolClients.find((client) => client.ClientName.includes(
    `cluster-${sandboxId}`,
  )).ClientId;
*/

const authenticationMiddleware = async (app) => {
  app.set('keys', {});

  const poolId = await config.awsUserPoolIdPromise;
  return jwt({
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

module.exports = { authenticationMiddleware };
