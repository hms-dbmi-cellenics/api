const config = require('../../config');
const {
  createDynamoDbInstance, convertToDynamoDbRecord, convertToJsObject,
} = require('../../utils/dynamoDb');
const logger = require('../../utils/logging').defaultLogger;

const { OK, NotFoundError } = require('../../utils/responses');
const safeBatchGetItem = require('../../utils/safeBatchGetItem');

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

    logger.log(`Project ${projectUuid} not found`);
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

  /**
   * Finds all projects referenced in experiments.
   */
  async getProjects(user) {
    if (!user) {
      return [];
    }
    // Get project data from the experiments table. Only return
    // those tables that have a project ID associated with them.
    const params = {
      TableName: experimentService.experimentsTableName,
      FilterExpression: 'attribute_exists(projectId) and contains(#rbac_can_write, :userId)',
      ExpressionAttributeNames: {
        '#pid': 'projectId',
        '#rbac_can_write': 'rbac_can_write',
      },
      ExpressionAttributeValues: {
        ':userId': { S: user.sub },
      },
      ProjectionExpression: '#pid',
    };

    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.scan(params).promise();

    if (!response.Items.length) {
      return [];
    }

    const projectIds = response.Items.map(
      (entry) => convertToJsObject(entry).projectId,
    ).filter((id) => id);

    return this.getProjectsFromIds(new Set(projectIds));
  }

  /**
   * Returns information about a group of projects.
   *
   * @param {Set} projectIds A Set of projectId values that are to be queried.
   * @returns An object containing descriptions of projects.
   */
  async getProjectsFromIds(projectIds) {
    const dynamodb = createDynamoDbInstance();
    const params = {
      RequestItems: {
        [this.tableName]: {
          Keys: [...projectIds].map((projectUuid) => convertToDynamoDbRecord({ projectUuid })),
        },
      },
    };

    const data = await safeBatchGetItem(dynamodb, params);

    const existingProjectIds = new Set(data.Responses[this.tableName].map((entry) => {
      const newData = convertToJsObject(entry);
      return newData.projects.uuid;
    }));


    // Build up projects that do not exist in Dynamo yet.
    const projects = [...projectIds]
      .filter((entry) => (
        !existingProjectIds.has(entry)
      ))
      .map((emptyProject) => {
        const newProject = {};

        const id = emptyProject;
        newProject.name = id;
        newProject.uuid = id;
        newProject.samples = [];
        newProject.metadataKeys = [];
        newProject.experiments = [id];

        return newProject;
      });

    data.Responses[this.tableName].forEach((entry) => {
      const newData = convertToJsObject(entry);
      projects.push(newData.projects);
    });

    return projects;
  }

  async getExperiments(projectUuid) {
    const dynamodb = createDynamoDbInstance();

    const marshalledKey = convertToDynamoDbRecord({ projectUuid });

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
    };

    try {
      const response = await dynamodb.getItem(params).promise();
      const result = convertToJsObject(response.Item);

      if (!Object.prototype.hasOwnProperty.call(result, 'projects')) return [];

      return experimentService.getListOfExperiments(result.projects.experiments);
    } catch (e) {
      if (e.statusCode === 400) throw new NotFoundError('Project not found');
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
      const { experiments, samples: sampleUuids } = await this.getProject(projectUuid);

      if (experiments.length > 0) {
        const deletePromises = experiments.reduce((acc, experimentId) => {
          acc.push(experimentService.deleteExperiment(experimentId));
          acc.push(samplesService.deleteSamplesEntry(projectUuid, experimentId, sampleUuids));
          return acc;
        }, []);

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
