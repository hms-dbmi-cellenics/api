const _ = require('lodash');

const config = require('../../../config');
const AWS = require('../../../utils/requireAWS');
const getLogger = require('../../../utils/getLogger');
const { NotFoundError, OK } = require('../../../utils/responses');

const {
  createDynamoDbInstance,
  convertToJsObject,
  convertToDynamoDbRecord,
} = require('../../../utils/dynamoDb');

const { isRoleAuthorized } = require('./roles');
const { getAwsUserAttributesByEmail } = require('../../../utils/aws/user');

const logger = getLogger('[AccessService] - ');
const sendEmail = require('../../../utils/send-email');
const buildUserInvitedEmailBody = require('../../../utils/emailTemplates/buildUserInvitedEmailBody');

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

  async inviteUser(userEmail, experimentId, projectUuid, role, inviterUser) {
    logger.log('Trying to invite user for experiment ', experimentId);

    const userAttributes = await getAwsUserAttributesByEmail(userEmail);
    if (!userAttributes) {
      throw new NotFoundError('User is not registered');
    }

    const userSub = userAttributes.find((attr) => attr.Name === 'sub').Value;
    await this.grantRole(userSub, experimentId, projectUuid, role);

    const emailBody = buildUserInvitedEmailBody(userEmail, experimentId, inviterUser);
    await sendEmail(emailBody);

    return OK();
  }

  async revokeRole(userEmail, experimentId) {
    logger.log('Removing role for user ', userEmail, ' in experiment ', experimentId);

    const userAttributes = await getAwsUserAttributesByEmail(userEmail);
    const userId = userAttributes.find((attr) => attr.Name === 'sub').Value;

    const key = convertToDynamoDbRecord({
      experimentId,
      userId,
    });
    const dynamoParams = {
      TableName: this.userAccessTableName,
      Key: key,
    };

    const dynamodb = createDynamoDbInstance();

    await dynamodb.deleteItem(dynamoParams).promise();
    return OK();
  }

  async getRoles(experimentId) {
    logger.log('Getting access for experiment ', experimentId);
    const experimentEntries = await this.getExperimentEntries(
      this.userAccessTableName, experimentId,
    );

    const requests = [];
    experimentEntries.forEach(async (entry) => {
      requests.push(getAwsUserAttributesByEmail(entry.userId));
    });
    const results = await Promise.all(requests);

    const users = results.map((userInfo) => {
      const email = userInfo.find((attr) => attr.Name === 'email').Value;
      const name = userInfo.find((attr) => attr.Name === 'name').Value;
      const userId = userInfo.find((attr) => attr.Name === 'sub').Value;

      const { role } = experimentEntries.find((entry) => entry.userId === userId);
      return {
        name, email, role,
      };
    });

    // remove admin from returned list
    return users.filter((user) => user.role !== 'admin');
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
