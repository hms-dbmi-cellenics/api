const config = require('../../config');
const { createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord } = require('../../utils/dynamoDb');

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

    const plotConfig = convertToDynamoDbRecord(tableData);

    const params = {
      TableName: this.tableName,
      Item: plotConfig,
    };

    const dynamodb = createDynamoDbInstance();
    await dynamodb.putItem(params).promise();

    return tableData;
  }

  async updatePlotData(experimentId, plotUuid, plotData) {
    const marshalledData = convertToDynamoDbRecord({
      ':plotData': plotData,
      ':config': {},
    });

    const params = {
      TableName: this.tableName,
      Key: {
        experimentId: { S: experimentId }, plotUuid: { S: plotUuid },
      },
      UpdateExpression: 'SET plotData = :plotData, config = if_not_exists(config, :config)',
      ExpressionAttributeValues: marshalledData,
      ReturnValues: 'UPDATED_NEW',
    };

    const dynamodb = createDynamoDbInstance();
    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);
    return prettyData;
  }

  async read(experimentId, plotUuid) {
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
