const config = require('../../config');
const mockData = require('./mock-data.json');
const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord, configArrayToUpdateObjs,
} = require('../../utils/dynamoDb');

const NotFoundError = require('../../utils/NotFoundError');

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

    if (Object.keys(data).length === 0) {
      throw new NotFoundError('Experiment does not exist.');
    }

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

    if (Object.keys(data).length === 0) {
      throw new NotFoundError('Experiment does not exist.');
    }

    const prettyData = convertToJsObject(data.Item);

    return prettyData;
  }

  async updateCellSets(experimentId, cellSetData) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };

    key = convertToDynamoDbRecord(key);

    const data = convertToDynamoDbRecord({ ':x': cellSetData });

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
      ProjectionExpression: 'processingConfig',
    };

    const data = await dynamodb.getItem(params).promise();

    if (Object.keys(data).length === 0) {
      throw new NotFoundError('Experiment does not exist.');
    }

    const prettyData = convertToJsObject(data.Item);

    return prettyData;
  }

  async updateProcessingConfig(experimentId, processingConfig) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };

    key = convertToDynamoDbRecord(key);
    const { updExpr, attrNames, attrValues } = configArrayToUpdateObjs('processingConfig', processingConfig);

    const params = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression: updExpr,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
      ReturnValues: 'UPDATED_NEW',
    };

    const result = await dynamodb.updateItem(params).promise();
    return result;
  }
}

module.exports = ExperimentService;
