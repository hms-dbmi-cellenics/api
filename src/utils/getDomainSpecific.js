const config = require('../config');

const { ACCOUNT_ID } = require('../api.v2/constants');

const domainSpecific = {
  HMS: {
    adminEmail: 'cellenics_admin@listserv.med.harvard.edu',
  },
  BIOMAGE: {
    adminEmail: 'admin@biomage.net',
  },
  BIOMAGE_PRIVATE: {
    adminEmail: 'admin@biomage.net',
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
