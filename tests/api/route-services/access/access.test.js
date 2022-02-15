const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../../src/utils/requireAWS');

const {
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
  mockDynamoGetItem,
  mockDynamoBatchGetItem,
  mockDynamoScan,
} = require('../../../test-utils/mockAWSServices');
const AccessService = require('../../../../src/api/route-services/access');
const { OK } = require('../../../../src/utils/responses');

jest.mock('../../../../src/api/route-services/experiment');
jest.mock('../../../../src/utils/authMiddlewares');

describe('tests for the projects service', () => {
  const mockProject = {
    name: 'Test project',
    description: '',
    createdDate: '',
    lastModified: '',
    uuid: 'project-1',
    experiments: ['experiment-1'],
    lastAnalyzed: null,
    samples: [],
  };

  afterEach(() => {
    AWSMock.restore('DynamoDB');
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
});
