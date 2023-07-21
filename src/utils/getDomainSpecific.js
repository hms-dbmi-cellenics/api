const config = require('../config');

const { ACCOUNT_ID } = require('../api.v2/constants');

const domainSpecific = {
  HMS: {

  },
  BIOMAGE: {

  },
  BIOMAGE_PRIVATE: {

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
