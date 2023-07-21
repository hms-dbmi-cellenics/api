const config = require('../config');
const { ACCOUNT_ID } = require('../api.v2/constants');

const NotAgreedToTermsError = require('./responses/NotAgreedToTermsError');

// Throws if the user hasnt agreed to the privacy policy yet
const checkForPrivacyPolicyAgreement = (req, next) => {
  // TODO: These commented out lines might not be necessary if we can rely on the
  // account_id check from getDomainSpecific(), but test before we actually remove them
  // const isBiomageDeployment = BIOMAGE_DOMAIN_NAMES.includes(config.domainName);

  // if (req.user['custom:agreed_terms'] !== 'true' && isBiomageDeployment) {
  if (req.user['custom:agreed_terms'] !== 'true') {
    next(new NotAgreedToTermsError('The user hasnt agreed to the privacy policy yet.'));
    return false;
  }

  return true;
};

const domainSpecific = {
  HMS: {
    adminEmail: 'cellenics_admin@listserv.med.harvard.edu',
    middlewareChecks: () => true,
  },
  BIOMAGE: {
    adminEmail: 'admin@biomage.net',
    middlewareChecks: (req, next) => checkForPrivacyPolicyAgreement(req, next),
  },
  BIOMAGE_PRIVATE: {
    adminEmail: 'admin@biomage.net',
    middlewareChecks: () => true,
  },
};

const getDomainSpecific = (component) => {
  switch (config.awsAccountId) {
    case ACCOUNT_ID.HMS:
      return domainSpecific.HMS[component];
    case ACCOUNT_ID.BIOMAGE:
      return domainSpecific.BIOMAGE[component];
    default:
      return domainSpecific.BIOMAGE_PRIVATE[component];
  }
};

module.exports = getDomainSpecific;
