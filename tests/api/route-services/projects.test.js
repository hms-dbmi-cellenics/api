const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const ProjectsService = require('../../../src/api/route-services/projects');
const { mockDynamoUpdateItem, mockDynamoDeleteItem, mockDynamoGetItem } = require('../../test-utils/mockAWSServices');
const { OK } = require('../../../src/utils/responses');

describe('tests for the projects service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  it('GetProject gets project and samples properly', async (done) => {
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
