
const _ = require('lodash');
const { MODULE_NAMES: mn, PERMISSIONS: perm, USER: u } = require('./permissionsConstants');

const config = require('../../config');
const AWS = require('../../utils/requireAWS');
const getLogger = require('../../utils/getLogger');

const {
  createDynamoDbInstance,
  convertToJsObject,
  convertToDynamoDbRecord,
  convertToDynamoUpdateParams,
} = require('../../utils/dynamoDb');
const { getModuleOf, getPermissionsFor } = require('./permissionsHelpers');


const logger = getLogger('[PermissionsService] - ');

class PermissionsService {
  constructor() {
    this.permissionsTableName = `permissions-${config.clusterEnv}`;
    this.db = createDynamoDbInstance();
  }


  async getExperimentPermissions(experimentId, userId) {
    const params = {
      TableName: this.permissionsTableName,
      Key: {
        ...convertToDynamoDbRecord({ experimentId, userId }),
      },
    };

    const response = await this.db.getItem(params).promise();
    return convertToJsObject(response.Item);
  }

  // grantAllPermissions gives the user complete access to the experiment
  async grantAllPermissions(userId, experimentId, projectId) {
    await this.grantPermissions(userId, experimentId, projectId, mn.ALL, perm.READ_WRITE);
  }

  // grantExplorationPermissions forbids the user from changing experiment data and running the pipelines.
  async grantExplorationPermissions(userId, experimentId, projectId) {
    await this.grantPermissions(userId, experimentId, projectId, mn.ALL, perm.READ_WRITE);
  }

  async grantPermissions(userId, experimentId, projectId, module, mode) {
    logger.log(`PUT experiment permissions ${experimentId} data`);

    // retrieve current permissions to merge them with the incoming new permissions
    const permissions = await this.getExperimentPermissions(experimentId, userId);
    const updatedPermissions = _.merge(permissions, { [module]: mode });

    const params = {
      TableName: this.permissionsTableName,
      Item: {
        userId,
        experimentId,
        projectId,
        permissions: updatedPermissions,
      },
    };
    // this.db
    const docClient = new AWS.DynamoDB.DocumentClient({
      region: config.awsRegion,
    });

    await docClient.put(params).promise();
  }

  async canAccessExperiment(userId, experimentId, url, method) {
    logger.log(`GET experiment permissions ${experimentId} data`);
    const module = getModuleOf(url);
    const mode = getPermissionsFor(method);

    const params = {
      TableName: this.permissionsTableName,
      KeyConditionExpression: '#eId = :expId and #uId = :userId',
      ExpressionAttributeNames: {
        '#eId': 'experimentId',
        '#uId': 'userId',
      },
      ExpressionAttributeValues: {
        ...convertToDynamoDbRecord({ ':expId': experimentId, ':userId': userId }),
      },
    };

    const response = await this.db.query(params).promise();


    // ideally move this into the dynamo query
    const allowed = response.Items.some((p) => {
      const el = convertToJsObject(p);
      // return if the permissions neither applies to us nor to all
      if (el.userId !== userId && el.userId !== u.ANY) return false;
      // mode can be 'r' or 'rw'
      if (el.permissions[mn.ALL] && el.permissions[mn.ALL].includes(mode)) return true;
      if (el.permissions[module] && el.permissions[module].includes(mode)) return true;


      return false;
    });

    return allowed;
  }

  async getProjects(userId) {
    const params = {
      TableName: this.permissionsTableName,
      FilterExpression: '(userId = :userId)',
      ExpressionAttributeValues: {
        ...convertToDynamoDbRecord({ ':userId': userId }),
      },
    };

    const extractProjectIds = (resp) => resp.Items.map(
      (entry) => {
        const p = convertToJsObject(entry);
        if (p.permissions[mn.ALL] || p.permissions[mn.DATA_MANAGEMENT]) return p.projectId;
      },
    ).filter((p) => p);

    let response = await this.db.scan(params).promise();
    let projectIds = extractProjectIds(response);

    // Check if query exceeds limit
    while (response.LastEvaluatedKey) {
      params.ExclusiveStartKey = response.LastEvaluatedKey;

      // eslint-disable-next-line no-await-in-loop
      response = await this.db.scan(params).promise();
      projectIds = projectIds.concat(extractProjectIds(response));
    }

    // remove duplicates
    projectIds = _.uniq(projectIds);

    return projectIds;
  }
}

module.exports = PermissionsService;
