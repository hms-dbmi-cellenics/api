const getDomainSpecificContent = require('../../src/config/getDomainSpecificContent');
const { ACCOUNT_ID } = require('../../src/api.v2/constants');

describe('getDomainSpecificContent tests', () => {
  // Make a snapshot for each account
  Object.keys(ACCOUNT_ID).forEach((accountId) => {
    test(`check content for ${accountId}`, () => {
      // Set the environment variables
      process.env.AWS_ACCOUNT_ID = ACCOUNT_ID[accountId];
      process.env.NODE_ENV = 'production'; // Since the function checks if env is not 'test'

      const content = getDomainSpecificContent();
      expect(content).toMatchSnapshot();
    });
  });

  // Test for the default 'test' account
  test('check content for the default account', () => {
    process.env.AWS_ACCOUNT_ID = 'non_existent_account_id';
    process.env.NODE_ENV = 'production'; // Since the function checks if env is not 'test'

    const defaultContent = getDomainSpecificContent();
    expect(defaultContent).toMatchSnapshot();
  });
});
