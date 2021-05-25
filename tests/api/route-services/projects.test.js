const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const ProjectsService = require('../../../src/api/route-services/projects');
const ExperimentsService = require('../../../src/api/route-services/experiment');
const { mockDynamoUpdateItem, mockDynamoDeleteItem, mockDynamoGetItem } = require('../../test-utils/mockAWSServices');
const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api/route-services/experiment');

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
