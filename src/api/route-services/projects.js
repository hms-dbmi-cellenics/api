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
    if (response.Items) {
      response.Items.forEach((entry) => {
        const newEntry = convertToJsObject(entry);
        projectIds.push({ projectUuid: { S: newEntry.projectId } });
      });
      return this.getProjectsFromIds(projectIds);
    }
    throw new NotFoundError('No projects available!');
  }

  async getProjectsFromIds(projectIds) {
    const projects = [];
    const dynamodb = createDynamoDbInstance();

    const params = {
      RequestItems: {
        [this.tableName]: {
          Keys: projectIds,
        },
      },
    };

    return new Promise((resolve) => {
      dynamodb.batchGetItem(params, (err, data) => {
        if (err) {
          logger.log('Error: ', err);
        } else {
          const fetchedIds = data.Responses[this.tableName].map((entry) => {
            const newData = convertToJsObject(entry);
            return newData.projects.uuid;
          });
          const emptyProjects = projectIds.filter((entry) => (
            fetchedIds.every((entry2) => entry.projectUuid.S !== entry2)
          ));

          emptyProjects.forEach((emptyProject) => {
            const id = emptyProject.projectUuid.S;
            const newProject = {};
            newProject.name = id;
            newProject.uuid = id;
            newProject.samples = [];
            newProject.metadataKeys = [];
            newProject.experiments = [id];
            projects.push(newProject);
          });
          data.Responses[this.tableName].forEach((entry) => {
            const newData = convertToJsObject(entry);
            projects.push(newData.projects);
            if (projects.length === projectIds.length) {
              resolve(projects);
            }
          });
        }
      });
    });
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
