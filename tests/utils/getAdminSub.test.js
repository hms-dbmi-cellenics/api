const getAdminSub = require('../../src/utils/getAdminSub');
const config = require('../../src/config');

jest.mock('../../src/api.v2/helpers/cognito/getAwsPoolId');
jest.mock('../../src/config', () => ({
  cognitoISP: {
    adminGetUser: jest.fn(() => ({
      promise: () => Promise.resolve({
        Username: 'mockAdminSub',
      }),
    })),
    adminCreateUser: jest.fn(() => ({
      promise: () => Promise.resolve({
        User: {
          Username: 'newMockAdminSub',
        },
      }),
    })),
  },
}));

describe('getAdminSub', () => {
  it('Should return the correct admin sub', async () => {
    const adminSub = await getAdminSub();

    expect(config.cognitoISP.adminGetUser.mock.calls[0]).toMatchSnapshot();
    expect(adminSub).toEqual('mockAdminSub');
  });

  it('Should create a new admin user if admin user does not exist', async () => {
    config.cognitoISP.adminGetUser.mockImplementationOnce(() => ({
      promise: () => Promise.reject(new Error('User does not exist')),
    }));
    const adminSub = await getAdminSub();

    expect(adminSub).toEqual('newMockAdminSub');
    expect(config.cognitoISP.adminCreateUser.mock.calls[0]).toMatchSnapshot();
  });

  it('Should throw an error if there are other errors', async () => {
    config.cognitoISP.adminGetUser.mockImplementationOnce(() => ({
      promise: () => Promise.reject(new Error('Some other error')),
    }));

    expect(async () => {
      await getAdminSub();
    }).rejects.toThrow();
  });
});
