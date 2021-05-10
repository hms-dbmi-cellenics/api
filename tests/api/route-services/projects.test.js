const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');

const ProjectsService = require('../../../src/api/route-services/projects');

describe('tests for the projects service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  const mockDynamoUpdateItem = (jsData) => {
    const dynamodbData = {
      Attributes: AWS.DynamoDB.Converter.marshall({ projects: jsData }),
    };
    const getItemSpy = jest.fn((x) => x);
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'updateItem', (params, callback) => {
      getItemSpy(params);
      callback(null, dynamodbData);
    });
    return getItemSpy;
  };

  it('udpateProject work', async (done) => {
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

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':project': jsData,
    });

    const getItemSpy = mockDynamoUpdateItem(jsData);

    (new ProjectsService()).updateProject('project-1', jsData)
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'projects-test',
          Key: {
            projectUuid: { S: 'project-1' },
          },
          UpdateExpression: 'SET projects = :project',
          ExpressionAttributeValues: marshalledData,
          ReturnValues: 'UPDATED_NEW',
        });
      })
      .then(() => done());
  });
});
