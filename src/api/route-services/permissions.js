// const _ = require('lodash');

// const jsonMerger = require('json-merger');
const config = require('../../config');
const AWS = require('../../utils/requireAWS');
const getLogger = require('../../utils/getLogger');
// const { OK, NotFoundError, BadRequestError } = require('../../utils/responses');

// const safeBatchGetItem = require('../../utils/safeBatchGetItem');
// const { getSignedUrl } = require('../../utils/aws/s3');

// const constants = require('../general-services/pipeline-manage/constants');
// const downloadTypes = require('../../utils/downloadTypes');

const { getModuleOf, getPermissionsFor } = require('./permissionsHelpers');

const ALL = '*';
const READ = 'r';
const READ_WRITE = 'rw';


const logger = getLogger('[PermissionsService] - ');

class PermissionsService {
  constructor() {
    this.permissionsTableName = `permissions-${config.clusterEnv}`;
  }

  async addFullExperimentPermissions(userId, experimentId, projectId) {
    await this.addExperimentPermissions(userId, experimentId, projectId, ALL, READ_WRITE);
  }

  async addExperimentPermissions(userId, experimentId, projectId, module, mode) {
    logger.log(`PUT experiment permissions ${experimentId} data`);

    const params = {
      TableName: this.permissionsTableName,
      Item: {
        userId,
        experimentId,
        projectUuid: projectId,
        module,
        mode,
      },
    };
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
      KeyConditionExpression: '#eId = :expId',
      ExpressionAttributeNames: {
        '#eId': 'experimentId',
      },
      ExpressionAttributeValues: {
        ':expId': experimentId,
      },
    };
    // const dynamodb = createDynamoDbInstance();
    // TODO consider changing to the other API that we normally use
    const docClient = new AWS.DynamoDB.DocumentClient({
      region: config.awsRegion,
    });

    const permissions = await docClient.query(params).promise();
    // permissions.some(hasAccess);
    // ideally move this into the dynamo query
    const allowed = permissions.Items.some((p) => {
      // return if the permissions neither applies to us nor to all
      if (p.userId !== userId && p.userId !== ALL) return false;
      if (p.module !== module && p.module !== ALL) return false;
      // mode can be 'r' or 'rw'
      if (!p.mode.includes(mode)) return false;
      return true;
    });

    return allowed;
  }
}

module.exports = PermissionsService;
