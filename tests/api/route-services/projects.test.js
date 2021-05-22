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
const { OK } = require('../../../src/utils/responses');

describe('tests for the projects service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  it('GetProject gets a project and samples properly', async (done) => {
    const project = {
      name: 'Test project',
      description: '',
      createdDate: '',
      lastModified: '',
      uuid: 'project-1',
      experiments: [],
      lastAnalyzed: null,
      samples: [],
    };

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const getFnSpy = mockDynamoGetItem({ projects: project });

    (new ProjectsService()).getProject('project-1')
      .then((res) => {
        expect(res).toEqual(project);
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

    projectService.getProjectsFromIds = jest.fn().mockImplementation(() => fnResult);

    projectService.getProjects()
      .then((res) => {
        expect(res).toEqual(fnResult);
        expect(fnSpy).toHaveBeenCalledWith({
          TableName: 'experiments-test',
          ExpressionAttributeNames: {
            '#pid': 'projectId',
          },
          FilterExpression: 'attribute_exists(projectId)',
          ProjectionExpression: '#pid',
        });
        expect(projectService.getProjectsFromIds).toHaveBeenCalledWith(new Set(projectIdsArr));
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

  it('UpdateProject updates project properly', async (done) => {
    const jsData = {
      name: 'Test project',
      description: '',
      createdDate: '',
      lastModified: '',
      uuid: 'project-1',
      experiments: [],
      lastAnalyzed: null,
      samples: [],
    };

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':project': jsData,
    });

    const getItemSpy = mockDynamoUpdateItem({ projects: jsData });

    (new ProjectsService()).updateProject('project-1', jsData)
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

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const deleteSpy = mockDynamoDeleteItem();
    const getSpy = mockDynamoGetItem({ projects: { experiments } });

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
