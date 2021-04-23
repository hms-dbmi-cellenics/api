const config = require('../../config');
const mockData = require('./mock-data.json');

const AWS = require('../../utils/requireAWS');
const logger = require('../../utils/logging');

const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord, configArrayToUpdateObjs,
} = require('../../utils/dynamoDb');

const NotFoundError = require('../../utils/NotFoundError');

const getExperimentAttributes = async (tableName, experimentId, attributes) => {
  const dynamodb = createDynamoDbInstance();
  const key = convertToDynamoDbRecord({ experimentId });

  const params = {
    TableName: tableName,
    Key: key,
    ProjectionExpression: attributes.join(),
  };

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
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['experimentId', 'experimentName']);
    return data;
  }

  async getExperimentPermissions(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['experimentId', 'can_write']);
    return data;
  }

  async getProcessingConfig(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['processingConfig']);
    return data;
  }

  async getPipelineHandle(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['meta']);
    return {
      stateMachineArn: '',
      executionArn: '',
      ...data.meta.pipeline,
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

  async savePipelineHandle(experimentId, handle) {
    const dynamodb = createDynamoDbInstance();
    let key = { experimentId };

    key = convertToDynamoDbRecord(key);

    const data = convertToDynamoDbRecord({ ':x': handle });

    const params = {
      TableName: this.experimentsTableName,
      Key: key,
      UpdateExpression: 'set meta.pipeline = :x',
      ExpressionAttributeValues: data,
    };

    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);
    return prettyData;
  }
}

module.exports = ExperimentService;
