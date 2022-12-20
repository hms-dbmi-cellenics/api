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
  },
}));

describe('getAdminSub', () => {
  it('Should return the correct admin sub', async () => {
    const adminSub = await getAdminSub();

    expect(config.cognitoISP.adminGetUser.mock.calls[0]).toMatchSnapshot();
    expect(adminSub).toEqual('mockAdminSub');
  });

  it('Should return backup admin sub if admin user does not exist', async () => {
    config.cognitoISP.adminGetUser.mockImplementationOnce(() => ({
      promise: () => Promise.reject(new Error('User does not exist')),
    }));
    const adminSub = await getAdminSub();

    expect(adminSub).toEqual('00000000-0000-0000-0000-000000000000');
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
