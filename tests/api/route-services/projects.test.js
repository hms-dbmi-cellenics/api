const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const ProjectsService = require('../../../src/api/route-services/projects');
const { mockDynamoUpdateItem } = require('../../test-utils/mockAWSServices');
const { NotFoundError, OK } = require('../../../src/utils/responses');

describe('tests for the projects service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  it('Updates properly', async (done) => {
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


  it('Returns 404 if project is not found', async (done) => {
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

    (new ProjectsService()).updateProject('unknown-project', jsData)
      .then(() => done())
      .catch((err) => {
        expect(Object.is(err, NotFoundError)).toBe(true);
      });
  });
});
