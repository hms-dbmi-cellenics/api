const config = require('../../config');
const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord,
} = require('../../utils/dynamoDb');


class ProjectsService {
  constructor() {
    this.tableName = `projects-${config.clusterEnv}`;
  }

  async updateProject(projectUuid, project) {
    const marshalledData = convertToDynamoDbRecord({
      ':project': project,
    });

    const params = {
      TableName: this.tableName,
      Key: {
        projectUuid: { S: projectUuid },
      },
      UpdateExpression: 'SET projects = :project',
      ExpressionAttributeValues: marshalledData,
      ReturnValues: 'UPDATED_NEW',
    };

    const dynamodb = createDynamoDbInstance();
    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);

    return prettyData.projects;
  }
}


module.exports = ProjectsService;
