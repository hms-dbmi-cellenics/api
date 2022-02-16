const AWSMock = require('aws-sdk-mock');
const fake = require('../../../test-utils/constants');

const {

  mockDocClientQuery,
  mockDocClientBatchWrite,
  mockDynamoScan,
} = require('../../../test-utils/mockAWSServices');
const AccessService = require('../../../../src/api/route-services/access');

jest.mock('../../../../src/api/route-services/experiment');
jest.mock('../../../../src/utils/authMiddlewares');

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

    const responseItems = await AccessService.getExperimentEntries('table', fake.EXPERIMENT_ID);

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

    AccessService.getExperimentEntries = getMock;

    const as = new AccessService();
    as.deleteExperimentEntries = deleteMock;
    await as.deleteExperiment(fake.EXPERIMENT_ID);

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  test('deleteExperiment does not call delete if there are no items', async () => {
    const getMock = jest.fn(() => []);
    const deleteMock = jest.fn();

    AccessService.getExperimentEntries = getMock;

    const as = new AccessService();
    as.deleteExperimentEntries = deleteMock;
    await as.deleteExperiment(fake.EXPERIMENT_ID);

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenCalledTimes(0);
  });
});
