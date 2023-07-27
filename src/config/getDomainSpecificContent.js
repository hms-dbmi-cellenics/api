const { ACCOUNT_ID } = require('../api.v2/constants');

const domainSpecificContent = {
  test: {
    githubOrganisationName: 'org',
    adminEmail: 'admin@example.com',
    enforcePrivacyPolicyAgreement: true,
    notificationEmail: 'some@email.com',
    moreEmailInfo: '<div>test hi info</div>',
  },
  [ACCOUNT_ID.HMS]: {
    githubOrganisationName: 'hms-dbmi-cellenics',
    adminEmail: 'cellenics_admin@listserv.med.harvard.edu',
    enforcePrivacyPolicyAgreement: false,
    notificationEmail: 'alex_pickering@hms.harvard.edu',
    moreEmailInfo: '',
  },
  [ACCOUNT_ID.BIOMAGE]: {
    githubOrganisationName: 'biomage-org',
    adminEmail: 'admin@biomage.net',
    enforcePrivacyPolicyAgreement: true,
    notificationEmail: `notification@${process.env.DOMAIN_NAME}`,
    moreEmailInfo: `More information about Cellenics can be found at <a href="https://biomage.net">biomage.net</a>.<br/><br/>
              If you need help or have any questions, please contact us at hello@biomage.net. <br/><br/>`,
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

