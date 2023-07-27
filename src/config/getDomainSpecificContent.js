const { ACCOUNT_ID } = require('../api.v2/constants');

const NotAgreedToTermsError = require('../utils/responses/NotAgreedToTermsError');

// Throws if the user hasnt agreed to the privacy policy yet
const checkForPrivacyPolicyAgreement = (req, next) => {
  // TODO: These commented out lines might not be necessary if we can rely on the
  // account_id check from getDomainSpecificContent(), but test before we actually remove them
  // const BIOMAGE_DOMAIN_NAMES = ['scp.biomage.net', 'scp-staging.biomage.net'];
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
    githubOrganisationName: 'hms-dbmi-cellenics',
    notificationEmail: 'alex_pickering@hms.harvard.edu',
    moreEmailInfo: '',
  },
  BIOMAGE: {
    adminEmail: 'admin@biomage.net',
    middlewareChecks: (req, next) => checkForPrivacyPolicyAgreement(req, next),
    githubOrganisationName: 'biomage-org',
    notificationEmail: `notification@${process.env.DOMAIN_NAME}`,
    moreEmailInfo: `More information about Cellenics can be found at <a href="https://biomage.net">biomage.net</a>.<br/><br/>
              If you need help or have any questions, please contact us at hello@biomage.net. <br/><br/>`,
  },
  BIOMAGE_PRIVATE: {
    adminEmail: 'admin@biomage.net',
    middlewareChecks: () => true,
  },
  TEST: {
    adminEmail: 'admin@example.com',
    middlewareChecks: () => true,
    githubOrganisationName: 'org',
    notificationEmail: 'some@email.com',
    moreEmailInfo: '<div>test hi info</div>',
  },
};

const getDomainSpecificContent = (component) => {
  if (process.env.NODE_ENV === 'test') return domainSpecific.TEST;

  switch (process.env.AWS_ACCOUNT_ID) {
    case ACCOUNT_ID.HMS:
      return domainSpecific.HMS[component];
    case ACCOUNT_ID.BIOMAGE:
      return domainSpecific.BIOMAGE[component];
    default:
      return domainSpecific.BIOMAGE_PRIVATE[component];
  }
};

module.exports = getDomainSpecificContent;


// test: {
// githubOrganisationName: 'org',
// adminEmail: 'admin@example.com',
// enforcePrivacyPolicyAgreement: false,
// notificationEmail: 'some@email.com',
// moreEmailInfo: '<div>test hi info</div>',
// },

// [ACCOUNT_ID.HMS]: {
// githubOrganisationName: 'hms-dbmi-cellenics',
// adminEmail: 'cellenics_admin@listserv.med.harvard.edu',
// enforcePrivacyPolicyAgreement: false,
// notificationEmail: 'alex_pickering@hms.harvard.edu',
// moreEmailInfo: '',
// },

// [ACCOUNT_ID.BIOMAGE]: {
// githubOrganisationName: 'biomage-org',
// adminEmail: 'admin@biomage.net',
// enforcePrivacyPolicyAgreement: true,
// notificationEmail: `notification@${process.env.DOMAIN_NAME}`,
// moreEmailInfo: `More information about Cellenics can be found at <a href="https://biomage.net">biomage.net</a>.<br/><br/>
// If you need help or have any questions, please contact us at hello@biomage.net. <br/><br/>`,
