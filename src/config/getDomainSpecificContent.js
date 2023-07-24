const { ACCOUNT_ID } = require('../api.v2/constants');

const domainSpecificContent = {
  test: {
    githubOrganisationName: 'org',
    adminEmail: 'admin@example.com',
    enforcePrivacyPolicyAgreement: true,
  },
  [ACCOUNT_ID.HMS]: {
    githubOrganisationName: 'hms-dbmi-cellenics',
    adminEmail: 'cellenics_admin@listserv.med.harvard.edu',
    enforcePrivacyPolicyAgreement: false,
  },
  [ACCOUNT_ID.BIOMAGE]: {
    githubOrganisationName: 'biomage-org',
    adminEmail: 'admin@biomage.net',
    enforcePrivacyPolicyAgreement: true,

  },
};

const getDomainSpecificContent = () => {
  const env = process.env.NODE_ENV;
  const accountId = process.env.AWS_ACCOUNT_ID;

  if (accountId in domainSpecificContent && env !== 'test') {
    return domainSpecificContent[accountId];
  }

  return domainSpecificContent.test;
};

module.exports = getDomainSpecificContent;
