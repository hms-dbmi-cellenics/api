const config = require('../../config');
const mockData = require('./mock-data.json');

const AWS = require('../../utils/requireAWS');
const logger = require('../../utils/logging');

const { OK, NotFoundError } = require('../../utils/responses');
const constants = require('../general-services/pipeline-manage/constants');


const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord, configArrayToUpdateObjs,
} = require('../../utils/dynamoDb');

const getExperimentAttributes = async (tableName, experimentId, attributes) => {
  const dynamodb = createDynamoDbInstance();
  const key = convertToDynamoDbRecord({ experimentId });

  const params = {
    TableName: tableName,
    Key: key,
  };

  if (Array.isArray(attributes) && attributes.length > 0) {
    params.ProjectionExpression = attributes.join();
  }

  const data = await dynamodb.getItem(params).promise();
  if (Object.keys(data).length === 0) {
    throw new NotFoundError('Experiment does not exist.');
  }

  const prettyData = convertToJsObject(data.Item);
  return prettyData;
};

class ExperimentService {
  constructor() {
    this.experimentsTableName = `experiments-${config.clusterEnv}`;
    this.cellSetsBucketName = `cell-sets-${config.clusterEnv}`;

    mockData.matrixPath = mockData.matrixPath.replace('BUCKET_NAME', `biomage-source-${config.clusterEnv}`);
    this.mockData = convertToDynamoDbRecord(mockData);
  }

  async getExperimentData(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId,
      ['projectId', 'meta', 'experimentId', 'experimentName']);
    return data;
  }

  async getListOfExperiments(experimentIds) {
    const dynamodb = createDynamoDbInstance();

    const params = {
      RequestItems: {
        [this.experimentsTableName]: {
          Keys: [...experimentIds].map((experimentId) => convertToDynamoDbRecord({ experimentId })),
        },
      },
    };

    try {
      const response = await dynamodb.batchGetItem(params).promise();

      return response.Responses[this.experimentsTableName].map(
        (experiment) => convertToJsObject(experiment),
      );
    } catch (e) {
      if (e.statusCode === 400) throw new NotFoundError('Experiments not found');
      throw e;
    }
  }


  async createExperiment(experimentId, body, user) {
    const dynamodb = createDynamoDbInstance();
    const key = convertToDynamoDbRecord({ experimentId });

    const documentClient = new AWS.DynamoDB.DocumentClient();

    const rbacCanWrite = Array.from(new Set([config.adminArn, user.sub]));

    const marshalledData = convertToDynamoDbRecord({
      ':experimentName': body.name,
      ':createdAt': body.createdAt,
      ':lastViewed': body.lastViewed,
      ':projectId': body.projectUuid,
      ':description': body.description,
      ':meta': {},
      ':rbac_can_write': documentClient.createSet(rbacCanWrite),
    });

    const params = {
      TableName: this.experimentsTableName,
      Key: key,
      UpdateExpression: `SET experimentName = :experimentName,
                          createdAt = :createdAt,
                          lastViewed = :lastViewed,
                          projectId = :projectId,
                          description = :description,
                          meta = :meta,
                          rbac_can_write = :rbac_can_write`,
      ExpressionAttributeValues: marshalledData,
      ConditionExpression: 'attribute_not_exists(#experimentId)',
      ExpressionAttributeNames: { '#experimentId': 'experimentId' },
      ReturnValues: 'ALL_NEW',
    };

    await dynamodb.updateItem(params).promise();

    return OK();
  }

  async updateExperiment(experimentId, body) {
    const dynamodb = createDynamoDbInstance();

    const dataToUpdate = {
      experimentName: body.name || body.experimentName,
      apiVersion: body.apiVersion,
      createdAt: body.createdAt,
      lastViewed: body.lastViewed,
      projectId: body.projectUuid || body.projectId,
      description: body.description,
      meta: body.meta,
      processingConfig: body.processingConfig,
    };

    const objectToMarshall = {};
    const updateExpression = Object.entries(dataToUpdate).reduce((acc, [key, val]) => {
      if (!val) {
        return acc;
      }

      const expressionKey = `:${key}`;
      objectToMarshall[expressionKey] = val;

      return [...acc, `${key} = ${expressionKey}`];
    }, []);

    // dataToUpdate = dataToUpdate.filter((attribute) => attribute.value);

    // let updateExpression = 'SET ';

    // dataToUpdate.forEach(({ key, value }) => {
    //   const expressionKey = `:${key}`;

    //   objectToMarshall[expressionKey] = value;
    //   updateExpression += `${key} = ${expressionKey},`;
    // });

    // updateExpression = _.trimEnd(updateExpression, ',');

    const params = {
      TableName: this.experimentsTableName,
      Key: convertToDynamoDbRecord({ experimentId }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: convertToDynamoDbRecord(objectToMarshall),
      ReturnValues: 'UPDATED_NEW',
    };

    const data = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(data.Attributes);

    return prettyData;
  }

  async getExperimentPermissions(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['experimentId', 'rbac_can_write']);
    return data;
  }

  async getProcessingConfig(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['processingConfig']);
    return data;
  }

  async getPipelinesHandles(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['meta']);

    return {
      [constants.QC_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
        ...data.meta.pipeline,
      },
      [constants.GEM2S_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
        ...data.meta.gem2s,
      },
    };
  }

  async getCellSets(experimentId) {
    const s3 = new AWS.S3();

    try {
      const outputObject = await s3.getObject(
        {
          Bucket: this.cellSetsBucketName,
          Key: experimentId,
        },
      ).promise();

      const data = JSON.parse(outputObject.Body.toString());

      return data;
    } catch (e) {
      if (e.code === 'NoSuchKey') {
        logger.log(`ERROR: Couldn't find s3 cell sets bucket with key: ${experimentId}`);

        const actualData = await getExperimentAttributes(this.experimentsTableName, experimentId, ['cellSets']);

        if (actualData) {
          logger.log('Found the cell sets in dynamodb, this means this experiment has an OUTDATED structure and its cell sets should be moved to s3');
        }

        return actualData;
      }

      throw e;
    }
  }

  async updateCellSets(experimentId, cellSetData) {
    const cellSetsObject = JSON.stringify({ cellSets: cellSetData });

    const s3 = new AWS.S3();

    await s3.putObject(
      {
        Bucket: this.cellSetsBucketName,
        Key: experimentId,
        Body: cellSetsObject,
      },
    ).promise();

    return cellSetData;
  }

  async updateProcessingConfig(experimentId, processingConfig) {
    const dynamodb = createDynamoDbInstance();

    let key = { experimentId };
    key = convertToDynamoDbRecord(key);

    const {
      updExpr,
      attrNames,
      attrValues,
    } = configArrayToUpdateObjs('processingConfig', processingConfig);

    const createEmptyProcessingConfigParams = {
      TableName: this.experimentsTableName,
      Key: { experimentId: { S: experimentId } },
      UpdateExpression: 'SET processingConfig = if_not_exists(processingConfig, :updatedObject)',
      ExpressionAttributeValues: { ':updatedObject': { M: {} } },
      ReturnValues: 'UPDATED_NEW',
    };

    await dynamodb.updateItem(createEmptyProcessingConfigParams).promise();

    const params = {
      TableName: this.experimentsTableName,
      Key: key,
      UpdateExpression: updExpr,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
      ReturnValues: 'UPDATED_NEW',
    };

    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);
    return prettyData;
  }

  async saveHandle(experimentId, handle, service) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };

    key = convertToDynamoDbRecord(key);

    const data = convertToDynamoDbRecord({ ':x': handle });

    const params = {
      TableName: this.experimentsTableName,
      Key: key,
      UpdateExpression: `set meta.${service} = :x`,
      ExpressionAttributeValues: data,
    };

    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);
    return prettyData;
  }

  async saveQCHandle(experimentId, handle) {
    return this.saveHandle(experimentId, handle, 'pipeline');
  }

  async saveGem2sHandle(experimentId, handle) {
    return this.saveHandle(experimentId, handle, 'gem2s');
  }
}

module.exports = ExperimentService;
