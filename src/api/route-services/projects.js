const config = require('../../config');
const {
  createDynamoDbInstance, convertToDynamoDbRecord, convertToJsObject,
} = require('../../utils/dynamoDb');
const logger = require('../../utils/logging');

const { OK, NotFoundError } = require('../../utils/responses');

const SamplesService = require('./samples');
const ExperimentService = require('./experiment');

const samplesService = new SamplesService();
const experimentService = new ExperimentService();
class ProjectsService {
  constructor() {
    this.tableName = `projects-${config.clusterEnv}`;
  }

  async getProject(projectUuid) {
    logger.log(`Getting project item with id ${projectUuid}`);
    const marshalledKey = convertToDynamoDbRecord({
      projectUuid,
    });

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();
    const response = await dynamodb.getItem(params).promise();
    if (response.Item) {
      const prettyResponse = convertToJsObject(response.Item);
      return prettyResponse.projects;
    }

    logger.log('Project not found');
    return response;
  }

  async updateProject(projectUuid, project) {
    logger.log(`Updating project with id ${projectUuid}`);
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
      if (e.statusCode === 400) throw new NotFoundError('Project not found');
      throw e;
    }
  }

  async getProjects() {
    const params = {
      TableName: experimentService.experimentsTableName,
      ExpressionAttributeNames: {
        '#pid': 'projectId',
      },
      FilterExpression: 'attribute_exists(projectId)',
      ProjectionExpression: '#pid',
    };

    const dynamodb = createDynamoDbInstance();
    const response = await dynamodb.scan(params).promise();
    const projectIds = [];

    response.Items.forEach((entry) => {
      const newEntry = convertToJsObject(entry);
      projectIds.push(newEntry.projectId);
    });
    const projects = [];

    if (projectIds.length) {
      return new Promise((resolve) => {
        projectIds.forEach(async (id) => {
          const newData = await this.getProject(id);

          if (!Object.keys(newData).length) {
            newData.name = id;
            newData.uuid = id;
            newData.samples = [];
            newData.metadataKeys = [];
            newData.experiments = [id];
          }
          projects.push(newData);
          if (projects.length === projectIds.length) {
            resolve(projects);
          }
        });
      });
    }
    throw new NotFoundError('no projects found');
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
      const { experiments } = await this.getProject(projectUuid);

      if (experiments.length > 0) {
        const deletePromises = experiments.map(
          (experimentId) => samplesService.deleteSamples(projectUuid, experimentId),
        );

        await Promise.all(deletePromises);
      }

      await dynamodb.deleteItem(params).send();

      return OK();
    } catch (e) {
      if (e.statusCode === 400) throw new NotFoundError('Project not found');
      throw e;
    }
  }
}


module.exports = ProjectsService;
