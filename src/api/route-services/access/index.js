
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
      },
    };

    // TODO refactor into using this.db
    const docClient = new AWS.this.db.DocumentClient({
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
}

module.exports = AccessService;
