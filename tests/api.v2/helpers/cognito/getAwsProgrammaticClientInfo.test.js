
const config = require('../../../../src/config');

const mockClients = {
  UserPoolClients: [
    {
      ClientId: '222222222222222222222222222',
      UserPoolId: 'eu-west-1_trivial',
      ClientName: 'biomage-cellscope-cluster-default',
    },
    {
      ClientId: '11111111111111111111111111',
      UserPoolId: 'eu-west-1_trivial',
      ClientName: 'biomage-programmatic-client-staging',
    },

  ],
};

jest.mock('../../../../src/config', () => ({
  ...jest.requireActual('../../../../src/config'),
  cognitoISP: {
    listUserPoolClients: jest.fn(() => ({
      promise: () => Promise.resolve(mockClients),
    })),
  },
}));

jest.mock('../../../../src/api.v2/helpers/cognito/getAwsPoolId');

const getAwsProgrammaticClientInfo = require('../../../../src/api.v2/helpers/cognito/getAwsProgrammaticClientInfo');


describe('getProgrammaticClientInfo', () => {
  it('returns a clientId and clientRegion when the client exists', async () => {
    const clientInfo = await getAwsProgrammaticClientInfo();
    expect(clientInfo).toMatchSnapshot();
  });

  it('returns a not found error when no matching client exists', async () => {
    config.cognitoISP.listUserPoolClients.mockImplementationOnce(jest.fn(() => ({
      promise: () => Promise.resolve({ UserPoolClients: [] }),
    })));
    try {
      await getAwsProgrammaticClientInfo();
    } catch (e) {
      expect(e).toMatchSnapshot();
    }
  });
});
