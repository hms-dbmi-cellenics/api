const config = require('../../config');
const { createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord } = require('../../utils/dynamoDb');
const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');

class PlotsTablesService {
  constructor() {
    this.tableName = `plots-tables-${config.clusterEnv}`;
  }

  async create(experimentId, plotUuid, data) {
    const tableData = {
      ...data,
      experimentId,
      plotUuid,
      lastUpdated: new Date().toDateString(),
    };

    const marshalledData = convertToDynamoDbRecord({
      ':config': data.config,
      ':lastUpdated': new Date().toDateString(),
    });

    const params = {
      TableName: this.tableName,
      Key: {
        experimentId: { S: experimentId }, plotUuid: { S: plotUuid },
      },
      UpdateExpression: 'SET config = :config, lastUpdated = :lastUpdated',
      ExpressionAttributeValues: marshalledData,
      ReturnValues: 'UPDATED_NEW',
    };

    const dynamodb = createDynamoDbInstance();
    await dynamodb.updateItem(params).promise();

    return tableData;
  }

  async updatePlotDataKey(experimentId, plotUuid, plotDataKey) {
    const marshalledData = convertToDynamoDbRecord({
      ':plotDataKey': plotDataKey,
      ':config': {},
    });

    const params = {
      TableName: this.tableName,
      Key: {
        experimentId: { S: experimentId }, plotUuid: { S: plotUuid },
      },
      UpdateExpression: 'SET plotDataKey = :plotDataKey, config = if_not_exists(config, :config)',
      ExpressionAttributeValues: marshalledData,
      ReturnValues: 'UPDATED_NEW',
    };

    const dynamodb = createDynamoDbInstance();
    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);
    return prettyData;
  }

  async readFromDynamoDB(experimentId, plotUuid) {
    const key = convertToDynamoDbRecord({
      experimentId,
      plotUuid,
    });

    const params = {
      TableName: this.tableName,
      Key: key,
    };

    const dynamodb = createDynamoDbInstance();
    const response = await dynamodb.getItem(params).promise();

    if (response.Item) {
      const prettyResponse = convertToJsObject(response.Item);
      return prettyResponse;
    }

    throw Error('Plot not found');
  }

  async readFromS3(plotDataKey) {
    // Download output from S3.
    const s3 = new AWS.S3();
    const bucket = this.tableName;

    const outputObject = await s3.getObject(
      {
        Bucket: bucket,
        Key: plotDataKey,
      },
    ).promise();

    const output = JSON.parse(outputObject.Body.toString());

    if (output.plotData) {
      await validateRequest(output, 'plots-tables-schemas/PlotData.v1.yaml');
    }

    return output;
  }

  async read(experimentId, plotUuid) {
    const configOutput = await this.readFromDynamoDB(experimentId, plotUuid);

    const { plotDataKey, ...configToReturn } = configOutput;

    if (plotDataKey) {
      const { plotData } = await this.readFromS3(plotDataKey);

      configToReturn.plotData = plotData || {};
    }

    return configToReturn;
  }

  async delete(experimentId, plotUuid) {
    const key = convertToDynamoDbRecord({
      experimentId,
      plotUuid,
    });

    const params = {
      TableName: this.tableName,
      Key: key,
    };

    const dynamodb = createDynamoDbInstance();
    await dynamodb.deleteItem(params).promise();
  }
}

module.exports = PlotsTablesService;
