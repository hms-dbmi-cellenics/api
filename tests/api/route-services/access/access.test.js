const AWSMock = require('aws-sdk-mock');
const fake = require('../../../test-utils/constants');

const {
  mockDocClientQuery,
  mockDocClientBatchWrite,
  mockDynamoScan,
  mockDynamoDeleteItem,
  mockDocClientPutItem,
} = require('../../../test-utils/mockAWSServices');
const AccessService = require('../../../../src/api/route-services/access');


jest.mock('../../../../src/api/route-services/experiment');
jest.mock('../../../../src/utils/authMiddlewares');

jest.mock('../../../../src/utils/aws/user', () => ({
  getAwsUserAttributesByEmail: jest.fn((email) => {
    if (email === 'asd@asd.com') {
      return Promise.resolve(null);
    }
    return [
      { Name: 'sub', Value: '032cdb44-0cd3-4d58-af21-850kp0b95ac7' },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: 'my name' },
      { Name: 'email', Value: 'asd.asd@asd.ac.uk' }];
  }),
}));

describe('tests for the projects service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  test('getExperimentEntries calls doc client', async () => {
    const items = [
      {
        userId: fake.USER.sub,
        experimentId: fake.EXPERIMENT_ID,
        projectId: fake.PROJECT_ID,
        role: 'OWNER',
      },
    ];
    const deleteSpy = mockDocClientQuery(items);


    const as = new AccessService();
    const responseItems = await as.getExperimentEntries('table', fake.EXPERIMENT_ID);

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy.mock.calls).toMatchSnapshot();
    expect(items).toEqual(responseItems);
  });

  test('deleteExperimentEntries calls doc client', async () => {
    const items = [
      {
        userId: fake.USER.sub,
        experimentId: fake.EXPERIMENT_ID,
        projectId: fake.PROJECT_ID,
        role: 'OWNER',
      },
    ];
    const deleteSpy = mockDocClientBatchWrite();

    const as = new AccessService();

    await as.deleteExperimentEntries(as.userAccessTableName, fake.EXPERIMENT_ID, items);

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy.mock.calls).toMatchSnapshot();

    deleteSpy.mockClear();

    await as.deleteExperimentEntries(as.inviteAccessTableName, fake.EXPERIMENT_ID, items);

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy.mock.calls).toMatchSnapshot();
  });

  test('GetAccessibleProjects gets all the projects across many pages of scan results', async () => {
    const projectIds1 = [
      {
        projectId: 'project-1',
      },
      {
        projectId: 'project-2',
      },
      {
        projectId: 'project-3',
      },
    ];

    const projectIds2 = [
      {
        projectId: 'project-4',
      },
      {
        projectId: 'project-5',
      },
      {
        projectId: 'project-6',
      },
    ];

    mockDynamoScan([projectIds1, projectIds2]);

    const expectedResult = [...projectIds1, ...projectIds2].map(({ projectId }) => projectId);

    const accessService = new AccessService();
    const user = { sub: 'mockSubject' };

    const res = await accessService.getAccessibleProjects(user);

    expect(res).toEqual(expectedResult);
  });

  test('GetProjects gets all the projects across many pages of scan results when the first page is empty', async () => {
    const emptyProjectIds = [];

    const projectIds2 = [
      {
        projectId: 'project-3',
      },
      {
        projectId: 'project-4',
      },
      {
        projectId: 'project-5',
      },
      {
        projectId: 'project-6',
      },
    ];

    mockDynamoScan([emptyProjectIds, projectIds2]);

    const expectedResult = [...emptyProjectIds, ...projectIds2].map(({ projectId }) => projectId);

    const accessService = new AccessService();
    const user = { sub: 'mockSubject' };

    const res = await accessService.getAccessibleProjects(user);

    expect(res).toEqual(expectedResult);
  });

  test('GetProjects removes duplicate projectIds', async () => {
    const projectIds1 = [
      {
        projectId: 'project-1',
      },
      {
        projectId: 'project-2',
      },
      {
        projectId: 'project-3',
      },
      {
        projectId: 'project-4',
      },
      {
        projectId: 'project-1',
      },
    ];

    mockDynamoScan([projectIds1]);

    const allProjectIds = projectIds1.map(({ projectId }) => projectId);
    const expectedResult = [...new Set(allProjectIds)];

    const accessService = new AccessService();
    const user = { sub: 'mockSubject' };

    const res = await accessService.getAccessibleProjects(user);

    expect(res).toEqual(expectedResult);
  });

  test('deleteExperiment calls get and delete', async () => {
    const items = [
      {
        userId: fake.USER.sub,
        experimentId: fake.EXPERIMENT_ID,
        projectId: fake.PROJECT_ID,
        role: 'OWNER',
      },
    ];

    const getMock = jest.fn(() => items);
    const deleteMock = jest.fn();


    const as = new AccessService();
    as.getExperimentEntries = getMock;
    as.deleteExperimentEntries = deleteMock;
    await as.deleteExperiment(fake.EXPERIMENT_ID);

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  test('deleteExperiment does not call delete if there are no items', async () => {
    const getMock = jest.fn(() => []);
    const deleteMock = jest.fn();


    const as = new AccessService();
    as.getExperimentEntries = getMock;
    as.deleteExperimentEntries = deleteMock;
    await as.deleteExperiment(fake.EXPERIMENT_ID);

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenCalledTimes(0);
  });

  test('inviting a user works', async () => {
    const grantRoleMock = jest.fn();
    const as = new AccessService();
    as.grantRole = grantRoleMock;
    await as.inviteUser(fake.USER.email, fake.EXPERIMENT_ID, fake.PROJECT_ID, 'admin', { email: 'inviter@user.com' });

    expect(grantRoleMock).toHaveBeenCalledTimes(1);
    expect(grantRoleMock.mock.calls).toEqual([[fake.USER.sub, fake.EXPERIMENT_ID, 'aaaaaaaa-bbbb-3333-4444-999999999999', 'admin']]);
  });

  test('not existent user calls adds to invite-access', async () => {
    const as = new AccessService();
    const addToInviteAccess = jest.fn();
    as.addToInviteAccess = addToInviteAccess;

    await as.inviteUser('asd@asd.com', fake.EXPERIMENT_ID, fake.PROJECT_ID, 'admin', { email: 'inviter@user.com' });
    expect(addToInviteAccess).toHaveBeenCalledTimes(1);
  });

  test('add to invite-access', () => {
    const as = new AccessService();
    const addItem = mockDocClientPutItem();
    as.addToInviteAccess(fake.USER.sub, fake.EXPERIMENT_ID, fake.PROJECT_ID, 'admin');
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(addItem.mock.calls).toMatchSnapshot();
  });

  test('Get roles', async () => {
    const as = new AccessService();
    const getExperimentEntriesMock = jest.fn(() => [{ userId: fake.USER.sub, role: 'owner' }]);
    as.getExperimentEntries = getExperimentEntriesMock;
    const roles = await as.getRoles(fake.EXPERIMENT_ID);
    expect(getExperimentEntriesMock).toHaveBeenCalledTimes(1);
    expect(getExperimentEntriesMock.mock.calls).toEqual([[as.userAccessTableName, fake.EXPERIMENT_ID]]);
    expect(roles).toEqual([{ name: 'my name', email: 'asd.asd@asd.ac.uk', role: 'owner' }]);
  });

  test('Revoke role', async () => {
    const as = new AccessService();
    const deleteSpy = mockDynamoDeleteItem();

    await as.revokeRole(fake.USER.email, fake.EXPERIMENT_ID);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(
      {
        Key: {
          experimentId: { S: fake.EXPERIMENT_ID },
          userId: { S: fake.USER.sub },
        },
        TableName: as.userAccessTableName,
      },
    );
  });
});
