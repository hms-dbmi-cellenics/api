const getDomainSpecificContent = require('../../src/config/getDomainSpecificContent');
const { ACCOUNT_ID } = require('../../src/api.v2/constants');

describe('getDomainSpecificContent tests', () => {
  // Make a snapshot for each account
  Object.keys(ACCOUNT_ID).forEach((accountId) => {
    it(`check content for ${accountId}`, () => {
      // Set the environment variables
      process.env.AWS_ACCOUNT_ID = ACCOUNT_ID[accountId];
      process.env.NODE_ENV = 'production'; // Since the function checks if env is not 'development'
      process.env.K8S_ENV = 'production';

      const content = getDomainSpecificContent();
      expect(content).toMatchSnapshot(`getDomainSpecificContent for ${accountId}`);
    });
  });

  // Test for the default biomage_private account
  it('check content for the biomage account', () => {
    process.env.AWS_ACCOUNT_ID = 'some_private_account_id';
    process.env.NODE_ENV = 'production'; // Since the function checks if env is not 'test'

    const defaultContent = getDomainSpecificContent();
    expect(defaultContent).toMatchSnapshot('getDomainSpecificContent for biomage private account');
  });

  // Test for the 'test' account
  it('check content for the test account', () => {
    process.env.AWS_ACCOUNT_ID = 'non_existent_account_id';
    process.env.NODE_ENV = 'test'; // Since the function checks if env is not 'test'

    const defaultContent = getDomainSpecificContent();
    expect(defaultContent).toMatchSnapshot('getDomainSpecificContent for test');
  });
});
