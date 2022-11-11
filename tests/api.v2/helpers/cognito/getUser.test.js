
jest.mock('../../../../src/api.v2/helpers/cognito/getAwsPoolId');


jest.mock('../../../../src/config', () => ({
  cognitoISP: {
    adminGetUser: jest.fn(({ Username }) => ({
      promise: () => Promise.resolve({
        UserAttributes: [
          { Name: 'name', Value: `${Username}-test` },
          { Name: 'email', Value: `${Username}@example.com` },
        ],
      }),
    })),
  },
}));


const getUser = require('../../../../src/api.v2/helpers/cognito/getUser');

describe('getUser', () => {
  it('returns a valid user', async () => {
    const userInfo = await getUser('email');
    expect(userInfo).toMatchSnapshot();
  });
});
