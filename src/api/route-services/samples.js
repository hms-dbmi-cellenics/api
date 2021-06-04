const _ = require('lodash');

const { NotFoundError, OK } = require('../../utils/responses');

const config = require('../../config');
const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord,
} = require('../../utils/dynamoDb');
const AWS = require('../../utils/requireAWS');

const logger = require('../../utils/logging');

class SamplesService {
  constructor() {
    this.tableName = `samples-${config.clusterEnv}`;
    this.sampleFilesBucketName = `biomage-originals-${config.clusterEnv}`;
  }

  async getSamples(projectUuid) {
    logger.log(`Getting samples for projectUuid : ${projectUuid}`);
    const marshalledData = convertToDynamoDbRecord({
      ':projectUuid': projectUuid,
    });

    const params = {
      TableName: this.tableName,
      IndexName: 'gsiByProjectAndExperimentID',
      KeyConditionExpression: 'projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    };
    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.query(params).promise();
    const items = response.Items;

    if (!items.length) {
      throw new NotFoundError('Samples not found!');
    }

    return items.map((item) => {
      const prettyItem = convertToJsObject(item);

      // Remove ids property from old sample entries that still have it
      delete prettyItem.samples.ids;

      return prettyItem;
    });
  }


  async getSamplesByExperimentId(experimentId) {
    logger.log(`Getting samples using experimentId : ${experimentId}`);
    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
      ProjectionExpression: 'samples',
    };
    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.getItem(params).promise();

    if (response.Item) {
      const prettyResponse = convertToJsObject(response.Item);
      // Remove ids property from old sample entries that still have it
      delete prettyResponse.samples.ids;
      return prettyResponse;
    }


    throw new NotFoundError('Samples not found');
  }

  async updateSamples(projectUuid, body) {
    logger.log(`Updating samples for project ${projectUuid} and expId ${body.experimentId}`);

    const marshalledKey = convertToDynamoDbRecord({
      experimentId: body.experimentId,
    });

    const marshalledData = convertToDynamoDbRecord({
      ':samples': body.samples,
      ':projectUuid': projectUuid,
    });

    // Update samples
    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
      UpdateExpression: 'SET samples = :samples, projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    };

    const dynamodb = createDynamoDbInstance();

    try {
      await dynamodb.updateItem(params).send();
      return OK();
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError('Project not found');
      throw e;
    }
  }

  async deleteSamplesFromS3(projectUuid, sampleUuids) {
    const s3 = new AWS.S3();

    const sampleObjectsToDelete = sampleUuids.map((sampleUuid) => (
      [
        { Key: `${projectUuid}/${sampleUuid}/barcodes.tsv.gz` },
        { Key: `${projectUuid}/${sampleUuid}/features.tsv.gz` },
        { Key: `${projectUuid}/${sampleUuid}/matrix.mtx.gz` },
      ]
    ));

    const s3Params = {
      Bucket: this.sampleFilesBucketName,
      Delete: {
        Objects: _.flatten(sampleObjectsToDelete),
        Quiet: false,
      },
    };

    const result = await s3.deleteObjects(s3Params).promise();

    if (result.Errors.length) {
      throw Error(`Delete S3 object errors: ${JSON.stringify(result.Errors)}`);
    }
  }

  async removeSamples(projectUuid, experimentId, sampleUuids) {
    logger.log(`Removing samples in an entry for project ${projectUuid} and expId ${experimentId}`);

    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const removeSamplesExpression = sampleUuids.map(
      (sampleUuid) => `samples.${sampleUuid}`,
    ).join(', ');

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
      UpdateExpression: `REMOVE ${removeSamplesExpression}`,
      ReturnValues: 'ALL_NEW',
    };

    await createDynamoDbInstance().updateItem(params).promise();
  }

  async deleteSamplesEntry(projectUuid, experimentId, sampleUuids) {
    logger.log(`Deleting samples entry for project ${projectUuid} and expId ${experimentId}`);

    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const dynamodbParams = {
      TableName: this.tableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();

    try {
      await dynamodb.deleteItem(dynamodbParams).send();
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError('Project not found');
      throw e;
    }

    if (sampleUuids.length) {
      this.deleteSamplesFromS3(projectUuid, sampleUuids);
    }

    return OK();
  }
}

module.exports = SamplesService;
