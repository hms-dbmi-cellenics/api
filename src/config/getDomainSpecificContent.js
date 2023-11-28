const { ACCOUNT_ID } = require('../api.v2/constants');

const NotAgreedToTermsError = require('../utils/responses/NotAgreedToTermsError');

// Throws if the user hasnt agreed to the privacy policy yet
const checkForPrivacyPolicyAgreement = (req, next) => {
  if (req.user['custom:agreed_terms'] !== 'true') {
    next(new NotAgreedToTermsError('The user hasnt agreed to the privacy policy yet.'));
    return false;
  }

  return true;
};

const domainName = process.env.DOMAIN_NAME || 'localhost:5000';

const domainSpecific = {
  HMS: {
    adminEmail: 'cellenics_admin@listserv.med.harvard.edu',
    middlewareChecks: () => true,
    githubOrganisationName: 'hms-dbmi-cellenics',
    notificationEmail: 'alex_pickering@hms.harvard.edu',
    moreEmailInfo: '',
    // using Batch by default in 'production'
    podCPUs: 8,
    podMemory: 57344,
  },
  BIOMAGE: {
    adminEmail: 'admin@biomage.net',
    middlewareChecks: (req, next) => checkForPrivacyPolicyAgreement(req, next),
    githubOrganisationName: 'biomage-org',
    notificationEmail: `notification@${domainName}`,
    moreEmailInfo: `More information about Cellenics can be found at <a href="https://biomage.net">biomage.net</a>.<br/><br/>
              If you need help or have any questions, please contact us at hello@biomage.net. <br/><br/>`,
    // not using Batch by default in 'production'
    podCPUs: null,
    podMemory: null,
  },
  BIOMAGE_PRIVATE: {
    adminEmail: 'admin@biomage.net',
    middlewareChecks: () => true,
    githubOrganisationName: 'biomage-org',
    notificationEmail: `notification@${domainName}`,
    moreEmailInfo: `More information about Cellenics can be found at <a href="https://biomage.net">biomage.net</a>.<br/><br/>
              If you need help or have any questions, please contact us at hello@biomage.net. <br/><br/>`,
    // not using Batch by default in 'production'
    podCPUs: null,
    podMemory: null,
  },
  TEST: {
    adminEmail: 'admin@example.com',
    middlewareChecks: () => true,
    githubOrganisationName: 'org',
    notificationEmail: 'some@email.com',
    moreEmailInfo: '<div>test hi info</div>',
    podCPUs: null,
    podMemory: null,
  },
};

const getAccountId = () => {
  const {
    NODE_ENV: nodeEnv,
    K8S_ENV: k8sEnv,
  } = process.env;

  let awsAccountId = process.env.AWS_ACCOUNT_ID;

  // Based on the explanation in default-config.js, NODE_ENV may not be set in development
  // So rely on checking if K8S_ENV is undefined as backup
  if (nodeEnv === 'development' || k8sEnv === undefined) {
    if (process.env.DEV_ACCOUNT === undefined) {
      throw new Error(
        `In local environment, DEV_ACCOUNT is expected to be set, possible values are: ${Object.keys(ACCOUNT_ID)} or "private" for private aws accounts`,
      );
    }

    awsAccountId = ACCOUNT_ID[process.env.DEV_ACCOUNT];
  }

  return awsAccountId;
};

const getDomainSpecificContent = () => {
  if (process.env.NODE_ENV === 'test') return domainSpecific.TEST;

  const awsAccountId = getAccountId();

  switch (awsAccountId) {
    case ACCOUNT_ID.HMS:
      return domainSpecific.HMS;
    case ACCOUNT_ID.BIOMAGE:
      return domainSpecific.BIOMAGE;
    default:
      return domainSpecific.BIOMAGE_PRIVATE;
  }
};

module.exports = getDomainSpecificContent;
