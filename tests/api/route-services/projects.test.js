const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const ProjectsService = require('../../../src/api/route-services/projects');
const {
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
  mockDynamoGetItem,
  mockDynamoBatchGetItem,
  mockDynamoScan,
} = require('../../test-utils/mockAWSServices');
const ExperimentsService = require('../../../src/api/route-services/experiment');
const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api/route-services/experiment');
jest.mock('../../../src/utils/authMiddlewares');

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

  it('GetProject gets project and samples properly', async (done) => {
    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const getFnSpy = mockDynamoGetItem({ projects: mockProject });

    (new ProjectsService()).getProject('project-1')
      .then((res) => {
        expect(res).toEqual(mockProject);
        expect(getFnSpy).toHaveBeenCalledWith({
          TableName: 'projects-test',
          Key: marshalledKey,
        });
      })
      .then(() => done());
  });

  it('GetProjects gets all the projects', async (done) => {
    const fnResult = [
      {
        uuid: 'project-1',
        name: 'Project 1',
      },
      {
        uuid: 'project-2',
        name: 'Project 2',
      },
      {
        uuid: 'project-3',
        name: 'Project 3',
      },
    ];

    const projectIds = fnResult.map((project) => ({ projectId: project.uuid }));
    const projectIdsArr = Object.values(projectIds).map((project) => project.projectId);

    const fnSpy = mockDynamoScan(projectIds);

    const projectService = new ProjectsService();
    const user = { sub: 'mockSubject' };

    projectService.getProjectsFromIds = jest.fn().mockImplementation(() => fnResult);

    projectService.getProjects(user)
      .then((res) => {
        expect(res).toEqual(fnResult);
        expect(fnSpy).toHaveBeenCalledWith({
          TableName: 'experiments-test',
          ExpressionAttributeNames: {
            '#pid': 'projectId',
            '#rbac_can_write': 'rbac_can_write',
          },
          ExpressionAttributeValues: {
            ':userId': { S: user.sub },
          },
          FilterExpression: 'attribute_exists(projectId) and contains(#rbac_can_write, :userId)',
          ProjectionExpression: '#pid',
        });
        expect(projectService.getProjectsFromIds).toHaveBeenCalledWith(projectIdsArr);
      })
      .then(() => done());
  });


  it('getProjectsFromIds gets all the projects from ids', async (done) => {
    const requestResult = {
      Responses: {
        'projects-test': [
          {
            projectUuid: 'project-1',
            projects: {
              name: 'Project 1',
              uuid: 'project-1',
            },
          },
          {
            projectUuid: 'project-2',
            projects: {
              name: 'Project 2',
              uuid: 'project-2',
            },
          },
          {
            projectUuid: 'project-3',
            projects: {
              name: 'Project 3',
              uuid: 'project-3',
            },
          },
        ],
      },
    };

    const projectIds = ['project-1', 'project-2', 'project-3'];
    const fnResult = requestResult.Responses['projects-test'].map((project) => project.projects);

    const fnSpy = mockDynamoBatchGetItem(requestResult);

    (new ProjectsService()).getProjectsFromIds(projectIds)
      .then((res) => {
        expect(res).toEqual(fnResult);
        expect(fnSpy).toHaveBeenCalledWith({
          RequestItems: {
            'projects-test': {
              Keys: [
                { projectUuid: { S: 'project-1' } },
                { projectUuid: { S: 'project-2' } },
                { projectUuid: { S: 'project-3' } },
              ],
            },
          },
        });
      })
      .then(() => done());
  });

  it('getProjectsFromIds create non existing projects', async (done) => {
    const requestResult = {
      Responses: {
        'projects-test': [
          {
            projectUuid: 'project-1',
            projects: {
              name: 'Project 1',
              uuid: 'project-1',
            },
          },
        ],
      },
    };

    const createEmptyProject = (projectId) => {
      const newProject = {};

      const id = projectId;
      newProject.name = id;
      newProject.uuid = id;
      newProject.samples = [];
      newProject.metadataKeys = [];
      newProject.experiments = [id];

      return newProject;
    };

    const projectIds = ['project-1', 'project-2', 'project-3'];
    const fnResult = [
      createEmptyProject('project-2'),
      createEmptyProject('project-3'),
      ...requestResult.Responses['projects-test'].map((project) => project.projects),
    ];

    const fnSpy = mockDynamoBatchGetItem(requestResult);

    (new ProjectsService()).getProjectsFromIds(projectIds)
      .then((res) => {
        expect(res).toEqual(fnResult);
        expect(fnSpy).toHaveBeenCalledWith({
          RequestItems: {
            'projects-test': {
              Keys: [
                { projectUuid: { S: 'project-1' } },
                { projectUuid: { S: 'project-2' } },
                { projectUuid: { S: 'project-3' } },
              ],
            },
          },
        });
      })
      .then(() => done());
  });

  it('GetExperiments gets projects', async (done) => {
    const fnSpy = mockDynamoGetItem({ projects: mockProject });

    const experimentsService = new ExperimentsService();

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: mockProject.projectUuid,
    });

    (new ProjectsService()).getExperiments()
      .then((res) => {
        expect(res).toEqual([{ experimentId: mockProject.experiments[0] }]);
        expect(fnSpy).toHaveBeenCalledWith({
          TableName: 'projects-test',
          Key: marshalledKey,
        });
        expect(
          experimentsService.getListOfExperiments,
        ).toHaveBeenCalledWith(mockProject.experiments);
      })
      .then(() => done());
  });

  it('UpdateProject updates project properly', async (done) => {
    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':project': mockProject,
    });

    const getItemSpy = mockDynamoUpdateItem({ projects: mockProject });

    (new ProjectsService()).updateProject('project-1', mockProject)
      .then((res) => {
        expect(res).toEqual(OK());
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'projects-test',
          Key: marshalledKey,
          UpdateExpression: 'SET projects = :project',
          ExpressionAttributeValues: marshalledData,
        });
      })
      .then(() => done());
  });

  it('DeleteProject deletes project and samples properly', async (done) => {
    const experiments = ['project-1'];
    const samples = [];

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const deleteSpy = mockDynamoDeleteItem();
    const getSpy = mockDynamoGetItem({ projects: { experiments, samples }, samples });

    (new ProjectsService()).deleteProject('project-1')
      .then((res) => {
        expect(res).toEqual(OK());
        expect(deleteSpy).toHaveBeenCalledWith({
          TableName: 'projects-test',
          Key: marshalledKey,
        });
        expect(getSpy).toHaveBeenCalledWith({
          TableName: 'projects-test',
          Key: marshalledKey,
        });
      })
      .then(() => done());
  });
});
