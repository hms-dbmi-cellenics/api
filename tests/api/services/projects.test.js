const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/aws/requireAWS');
const fake = require('../../test-utils/constants');

const {
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
  mockDynamoGetItem,
  mockDynamoBatchGetItem,
  mockDynamoScan,
} = require('../../test-utils/mockAWSServices');
const ExperimentsService = require('../../../src/api/services/experiments/ExperimentService');
const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api/route-services/experiment');
jest.mock('../../../src/utils/authMiddlewares');

const ProjectsService = require('../../../src/api/services/ProjectsService');


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

  test('GetProject gets project and samples properly', async () => {
    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const getFnSpy = mockDynamoGetItem({ projects: mockProject });

    const res = await (new ProjectsService()).getProject('project-1');

    expect(res).toEqual(mockProject);

    expect(getFnSpy).toHaveBeenCalledWith({
      TableName: 'projects-test',
      Key: marshalledKey,
    });
  });

  test('GetProjects gets all the projects', async () => {
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

    const fnSpy = mockDynamoScan([projectIds]);

    const projectService = new ProjectsService();
    const user = { sub: fake.USER.sub };

    projectService.getProjectsFromIds = jest.fn().mockImplementation(() => fnResult);

    const res = await projectService.getProjects(user);

    expect(res).toEqual(fnResult);

    expect(fnSpy).toMatchSnapshot();
    expect(projectService.getProjectsFromIds).toHaveBeenCalledWith(projectIdsArr);
  });

  test('GetProjects gets all the projects across many pages of scan results', async () => {
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

    const projectService = new ProjectsService();
    const user = { sub: 'mockSubject' };

    projectService.getProjectsFromIds = jest.fn().mockImplementation((x) => x);

    const res = await projectService.getProjects(user);

    expect(res).toEqual(expectedResult);

    expect(projectService.getProjectsFromIds).toHaveBeenCalledWith(expectedResult);
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

    const projectService = new ProjectsService();
    const user = { sub: 'mockSubject' };

    projectService.getProjectsFromIds = jest.fn().mockImplementation((x) => x);

    const res = await projectService.getProjects(user);

    expect(res).toEqual(expectedResult);

    expect(projectService.getProjectsFromIds).toHaveBeenCalledWith(expectedResult);
  });

  test('GetProjects removes duplicate projectIds from the call it makes to getProjectsFromIds', async () => {
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

    const allProjectIds = [...projectIds1, ...projectIds2].map(({ projectId }) => projectId);
    const expectedResult = [...new Set(allProjectIds)];

    const projectService = new ProjectsService();
    const user = { sub: 'mockSubject' };

    projectService.getProjectsFromIds = jest.fn().mockImplementation((x) => x);

    const res = await projectService.getProjects(user);

    expect(res).toEqual(expectedResult);

    expect(projectService.getProjectsFromIds).toHaveBeenCalledWith(expectedResult);
  });


  it('getProjectsFromIds gets all the projects from ids', async () => {
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

    const res = await (new ProjectsService()).getProjectsFromIds(projectIds);

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
  });

  it('getProjectsFromIds create non existing projects', async () => {
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

    const res = await (new ProjectsService()).getProjectsFromIds(projectIds);

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
  });

  test('GetExperiments gets projects', async () => {
    const fnSpy = mockDynamoGetItem({ projects: mockProject });

    const experimentsService = new ExperimentsService();

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: mockProject.projectUuid,
    });

    const res = await (new ProjectsService()).getExperiments();

    expect(res).toEqual([{ experimentId: mockProject.experiments[0] }]);

    expect(fnSpy).toHaveBeenCalledWith({
      TableName: 'projects-test',
      Key: marshalledKey,
    });

    expect(
      experimentsService.getListOfExperiments,
    ).toHaveBeenCalledWith(mockProject.experiments);
  });

  it('UpdateProject updates project properly', async () => {
    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: 'project-1',
    });

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':project': mockProject,
    });

    const getItemSpy = mockDynamoUpdateItem({ projects: mockProject });

    const res = await (new ProjectsService()).updateProject('project-1', mockProject);

    expect(res).toEqual(OK());

    expect(getItemSpy).toHaveBeenCalledWith({
      TableName: 'projects-test',
      Key: marshalledKey,
      UpdateExpression: 'SET projects = :project',
      ExpressionAttributeValues: marshalledData,
    });
  });

  test('DeleteProject deletes project, samples, and access properly', async () => {
    const experiments = [fake.EXPERIMENT_ID];
    const samples = [];

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      projectUuid: fake.PROJECT_ID,
    });

    const deleteSpy = mockDynamoDeleteItem();
    const getSpy = mockDynamoGetItem({ projects: { experiments, samples }, samples });


    const asSpy = jest.fn();
    const ssSpy = jest.fn();
    const esSpy = jest.fn();

    const ps = new ProjectsService();
    ps.accessService.deleteExperiment = asSpy;
    ps.samplesService.deleteSamplesEntry = ssSpy;
    ps.experimentService.deleteExperiment = esSpy;

    const res = await ps.deleteProject(fake.PROJECT_ID);

    // first call getProjects to get the experiment & samples info
    expect(getSpy).toHaveBeenCalledWith({
      TableName: 'projects-test',
      Key: marshalledKey,
    });

    // ensure that experiments, samples, and user access deletes are called
    expect(esSpy).toHaveBeenCalledTimes(1);
    expect(esSpy).toHaveBeenCalledWith(fake.EXPERIMENT_ID);

    expect(ssSpy).toHaveBeenCalledTimes(1);
    expect(ssSpy).toHaveBeenCalledWith(fake.PROJECT_ID, fake.EXPERIMENT_ID, samples);

    expect(asSpy).toHaveBeenCalledTimes(1);
    expect(asSpy).toHaveBeenCalledWith(fake.EXPERIMENT_ID);
    expect(res).toEqual(OK());

    // ensure that the project itself is deleted
    expect(deleteSpy).toHaveBeenCalledWith({
      TableName: 'projects-test',
      Key: marshalledKey,
    });
  });

  test('createProject creates entries in projects and samples correctly', (done) => {
    const updateItemSpy = mockDynamoUpdateItem({});

    (new ProjectsService()).createProject('project-1', mockProject)
      .then((res) => {
        expect(res).toEqual(OK());

        expect(updateItemSpy.mock.calls[0]).toMatchSnapshot();
        expect(updateItemSpy.mock.calls[1]).toMatchSnapshot();

        // Only these two calls to dynamo were made
        expect(updateItemSpy.mock.calls).toHaveLength(2);
      })
      .then(() => done());
  });
});
