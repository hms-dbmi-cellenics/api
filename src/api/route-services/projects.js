const config = require('../../config');
const {
  createDynamoDbInstance, convertToDynamoDbRecord,
} = require('../../utils/dynamoDb');
const logger = require('../../utils/logging');

const { OK, NotFoundError } = require('../../utils/responses');

class ProjectsService {
  constructor() {
    this.tableName = `projects-${config.clusterEnv}`;
  }

  async updateProject(projectUuid, project) {
    logger.log(`Updating project with id ${projectUuid}
      and payload ${project}`);
    const marshalledKey = convertToDynamoDbRecord({
      projectUuid,
    });

    const marshalledData = convertToDynamoDbRecord({
      ':project': project,
    });

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
      UpdateExpression: 'SET projects = :project',
      ExpressionAttributeValues: marshalledData,
    };

    const dynamodb = createDynamoDbInstance();

    try {
      await dynamodb.updateItem(params).send();
      return OK();
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError('Project not found');
      throw e;
    }
  }

  async deleteProject(projectUuid) {
    logger.log(`Deleting project with id ${projectUuid}`);
    const marshalledKey = convertToDynamoDbRecord({
      projectUuid,
    });

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();

    try {
      await dynamodb.deleteItem(params).promise();

      console.log('project deleted');

      return OK();
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError('Project not found');
      throw e;
    }
  }
}


module.exports = ProjectsService;
