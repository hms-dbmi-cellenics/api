const config = require('../../../../src/config');

jest.mock('../../../../src/api.v2/helpers/cognito/getAwsPoolId');


jest.mock('../../../../src/config', () => ({
  cognitoISP: {
    listUsers: jest.fn(() => ({
      promise: () => Promise.resolve({
        Users: [
          {
            Attributes: [
              { Name: 'name', Value: 'email-test' },
              { Name: 'email', Value: 'email@example.com' },
            ],
          },
        ],
      }),
    })),
  },
}));


const getUser = require('../../../../src/api.v2/helpers/cognito/getUser');

describe('getUser', () => {
  it('returns a valid user', async () => {
    const userInfo = await getUser('email@example.com', 'email');
    expect(userInfo).toMatchSnapshot();
  });

  it('throws an error with code UserNotFoundException if listUsers has length zero', async () => {
    config.cognitoISP.listUsers.mockImplementationOnce(jest.fn(() => ({
      promise: () => Promise.resolve({ Users: [] }),
    })));

    await expect(async () => await getUser('email@example.com', 'email')).rejects.toThrowError(
      expect.objectContaining({
        code: 'UserNotFoundException',
      }),
    );
  });
});
