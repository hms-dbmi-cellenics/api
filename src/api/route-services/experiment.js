const config = require('../../config');
const mockData = require('./mock-data.json');
const logger = require('../../utils/logging');
const { createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord } = require('../../utils/dynamoDb');


class ExperimentService {
  constructor() {
    this.tableName = `experiments-${config.clusterEnv}`;

    mockData.matrixPath = mockData.matrixPath.replace('BUCKET_NAME', `biomage-source-${config.clusterEnv}`);
    this.mockData = convertToDynamoDbRecord(mockData);
  }

  async getExperimentData(experimentId) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };
    key = convertToDynamoDbRecord(key);

    const params = {
      TableName: this.tableName,
      Key: key,
      ProjectionExpression: 'experimentId, experimentName',
    };
    const data = await dynamodb.getItem(params).promise();

    const prettyData = convertToJsObject(data.Item);
    return prettyData;
  }

  async getCellSets(experimentId) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };
    key = convertToDynamoDbRecord(key);

    const params = {
      TableName: this.tableName,
      Key: key,
      ProjectionExpression: 'cellSets',
    };

    const data = await dynamodb.getItem(params).promise();
    const prettyData = convertToJsObject(data.Item);

    return prettyData;
  }

  async updateCellSets(experimentId, cellSetData) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };

    key = convertToDynamoDbRecord(key);

    const data = convertToDynamoDbRecord({ ':x': cellSetData });

    logger.log(data);

    const params = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression: 'set cellSets = :x',
      ExpressionAttributeValues: data,
    };

    await dynamodb.updateItem(params).promise();

    return cellSetData;
  }

  async getProcessingConfig(experimentId) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };
    key = convertToDynamoDbRecord(key);

    const params = {
      TableName: this.tableName,
      Key: key,
      ProjectionExpression: 'processing',
    };

    const data = await dynamodb.getItem(params).promise();
    const prettyData = convertToJsObject(data.Item);

    return prettyData;
  }

  async updateProcessingConfig(experimentId, processingConfig) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };

    key = convertToDynamoDbRecord(key);

    const data = convertToDynamoDbRecord({ ':x': processingConfig });

    logger.log(data);

    const params = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression: 'set processing = :x',
      ExpressionAttributeValues: data,
    };

    await dynamodb.updateItem(params).promise();

    return processingConfig;
  }
}

module.exports = ExperimentService;
