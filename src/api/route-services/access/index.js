
const _ = require('lodash');

const config = require('../../../config');
const AWS = require('../../../utils/requireAWS');
const getLogger = require('../../../utils/getLogger');

const {
  createDynamoDbInstance,
  convertToJsObject,
  convertToDynamoDbRecord,
} = require('../../../utils/dynamoDb');

const { isRoleAuthorized } = require('./roles');

const logger = getLogger('[AccessService] - ');

class AccessService {
  constructor() {
    this.userAccessTableName = `user-access-${config.clusterEnv}`;
    this.inviteAccessTableName = `invite-access-${config.clusterEnv}`;
  }

  // grantRole adds or replaces role for userId and experimentId
  async grantRole(userId, experimentId, projectId, role) {
    logger.log(`PUT experiment role ${experimentId} data`);
    const params = {
      TableName: this.userAccessTableName,
      Item: {
        userId,
        experimentId,
        projectId,
        role,
        createdDate: new Date().toISOString(),
      },
    };

    const docClient = new AWS.DynamoDB.DocumentClient({
      region: config.awsRegion,
    });

    await docClient.put(params).promise();
  }

  async canAccessExperiment(userId, experimentId, url, method) {
    logger.log(`GET experiment permissions ${experimentId} data`);
    const key = convertToDynamoDbRecord({
      experimentId,
      userId,
    });

    const params = {
      TableName: this.userAccessTableName,
      Key: key,
    };

    const db = createDynamoDbInstance();
    const response = await db.getItem(params).promise();
    if (!response.Item) {
      // if there is no role for the user and experiment, reject authorization
      return false;
    }

    const { role } = convertToJsObject(response.Item);
    return isRoleAuthorized(role, url, method);
  }

  async getAccessibleProjects(userId) {
    const params = {
      TableName: this.userAccessTableName,
      FilterExpression: '(userId = :userId)',
      ExpressionAttributeValues: {
        ...convertToDynamoDbRecord({ ':userId': userId }),
      },
    };

    const extractProjectIds = (resp) => resp.Items.map(
      (entry) => {
        const p = convertToJsObject(entry);
        return p.projectId;
      },
    ).filter((p) => p);

    const db = createDynamoDbInstance();
    let response = await db.scan(params).promise();
    let projectIds = extractProjectIds(response);

    // Check if query exceeds limit
    while (response.LastEvaluatedKey) {
      params.ExclusiveStartKey = response.LastEvaluatedKey;

      // eslint-disable-next-line no-await-in-loop
      response = await db.scan(params).promise();
      projectIds = projectIds.concat(extractProjectIds(response));
    }

    // remove duplicates
    projectIds = _.uniq(projectIds);

    return projectIds;
  }

  // eslint-disable-next-line class-methods-use-this
  async getExperimentEntries(table, experimentId) {
    const docClient = new AWS.DynamoDB.DocumentClient({
      region: config.awsRegion,
    });
    const getParams = {
      TableName: table,
      KeyConditionExpression: 'experimentId = :hkey',
      ExpressionAttributeValues: {
        ':hkey': experimentId,
      },
    };

    const response = await docClient.query(getParams).promise();
    return response.Items;
  }

  async deleteExperimentEntries(table, experimentId, items) {
    const docClient = new AWS.DynamoDB.DocumentClient({
      region: config.awsRegion,
    });

    // the user access table uses userId as key
    // the invite access table uses userEmail as key
    const userMapper = (item) => ({ userId: item.userId });
    const inviteMapper = (item) => ({ userEmail: item.userEmail });
    // have a different mapper for each of them so we can reuse the rest of the delete logic
    const mapper = table === this.inviteAccessTableName ? inviteMapper : userMapper;

    // create the batch delete request for each user that had permissions for the experiment
    const deleteRequests = [];
    items.forEach((item) => {
      deleteRequests.push({
        DeleteRequest: {
          Key: {
            experimentId,
            ...mapper(item),
          },
        },
      });
    });

    const deleteParams = {
      RequestItems: {
        [table]: deleteRequests,
      },
    };

    await docClient.batchWrite(deleteParams).promise();
  }

  async deleteByExperimentId(table, experimentId) {
    const items = await this.getExperimentEntries(table, experimentId);
    if (items.length === 0) {
      // invite-access table can be empty, in that case skip deleting.
      return;
    }

    await this.deleteExperimentEntries(table, experimentId, items);
  }

  async deleteExperiment(experimentId) {
    Promise.all([
      this.deleteByExperimentId(this.userAccessTableName, experimentId),
      this.deleteByExperimentId(this.inviteAccessTableName, experimentId),
    ]);
  }
}

module.exports = AccessService;
