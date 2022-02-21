const _ = require('lodash');

const { NotFoundError, OK } = require('../../utils/responses');

const { undefinedIfNotFound } = require('./utils');

const config = require('../../config');
const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord,
} = require('../../utils/dynamoDb');
const AWS = require('../../utils/requireAWS');

const { getSignedUrl } = require('../../utils/aws/s3');
const getLogger = require('../../utils/getLogger');

const logger = getLogger();

class SamplesService {
  constructor() {
    this.samplesTableName = `samples-${config.clusterEnv}`;
    this.sampleFilesBucketName = `biomage-originals-${config.clusterEnv}`;
    this.projectsTableName = `projects-${config.clusterEnv}`;
  }

  async getSamples(projectUuid) {
    const marshalledData = convertToDynamoDbRecord({
      ':projectUuid': projectUuid,
    });

    const params = {
      TableName: this.samplesTableName,
      IndexName: 'gsiByProjectAndExperimentID',
      KeyConditionExpression: 'projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    };
    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.query(params).promise();
    const items = response.Items;

    if (!items.length) {
      throw new NotFoundError('Samples not found.');
    }

    return items.map((item) => {
      const prettyItem = convertToJsObject(item);

      // Remove ids property from old sample entries that still have it
      delete prettyItem.samples.ids;

      return prettyItem;
    });
  }

  async getSamplesByExperimentId(experimentId) {
    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const params = {
      TableName: this.samplesTableName,
      Key: marshalledKey,
      ProjectionExpression: 'samples',
    };
    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.getItem(params).promise();

    if (response.Item) {
      const prettyResponse = convertToJsObject(response.Item);

      // Remove ids property from old sample entries that still have it
      delete prettyResponse.samples.ids;

      return prettyResponse.samples;
    }

    throw new NotFoundError('Samples not found');
  }

  async updateSamples(projectUuid, experimentId, body) {
    logger.log(`Updating samples for project ${projectUuid} and expId ${experimentId}`);

    const dynamodb = createDynamoDbInstance();

    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const getSamplesParams = {
      TableName: this.samplesTableName,
      Key: marshalledKey,
      ProjectionExpression: 'samples',
    };

    // Merge samples record with the body
    const response = await dynamodb.getItem(getSamplesParams).promise();
    const { samples } = convertToJsObject(response.Item);

    const updatedSamples = _.merge(samples, body);

    const marshalledData = convertToDynamoDbRecord({
      ':samples': updatedSamples,
      ':projectUuid': projectUuid,
    });

    // Update samples
    const updateSamplesParams = {
      TableName: this.samplesTableName,
      Key: marshalledKey,
      UpdateExpression: 'SET samples = :samples, projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    };

    try {
      await dynamodb.updateItem(updateSamplesParams).send();
      return OK();
    } catch (e) {
      if (e.statusCode === 404) throw new NotFoundError('Project not found');
      throw e;
    }
  }

  async removeSamples(projectUuid, experimentId, sampleUuids) {
    logger.log(`Removing samples in an entry for project ${projectUuid} and expId ${experimentId}`);

    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const updateExpressionList = sampleUuids.map((sampleUuid, index) => `samples.#val${index}`);
    const expressionAttributeNames = sampleUuids.reduce((acc, sampleId, index) => {
      acc[`#val${index}`] = sampleId;
      return acc;
    }, {});

    const params = {
      TableName: this.samplesTableName,
      Key: marshalledKey,
      UpdateExpression: `REMOVE ${updateExpressionList.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    };

    const allSamples = await undefinedIfNotFound(
      this.getSamplesByExperimentId(experimentId),
    ) || {};

    const promises = [
      createDynamoDbInstance().updateItem(params).promise(),
      this.deleteSamplesFromS3(projectUuid, sampleUuids, allSamples),
    ];

    await Promise.all(promises);

    return OK();
  }

  async addSample(projectUuid, experimentId, newSample) {
    logger.log(`Adding sample ${newSample.uuid} to project with id ${projectUuid}`);

    const addSampleToSamples = async () => {
      const dynamodb = createDynamoDbInstance();

      const marshalledKey = convertToDynamoDbRecord({
        experimentId,
      });

      const marshalledData = convertToDynamoDbRecord({
        ':newSample': newSample,
      });

      const params = {
        TableName: this.samplesTableName,
        Key: marshalledKey,
        UpdateExpression: 'SET samples.#newSampleId = :newSample',
        ExpressionAttributeNames: {
          '#newSampleId': newSample.uuid,
        },
        ExpressionAttributeValues: marshalledData,
      };

      await dynamodb.updateItem(params).promise();
    };

    const addSampleIdToProjects = async () => {
      const marshalledKey = convertToDynamoDbRecord({
        projectUuid,
      });

      const marshalledData = convertToDynamoDbRecord({
        ':newSampleId': [newSample.uuid],
      });

      const params = {
        TableName: this.projectsTableName,
        Key: marshalledKey,
        UpdateExpression: 'SET projects.samples = list_append(projects.samples, :newSampleId)',
        ExpressionAttributeValues: marshalledData,
      };

      const dynamodb = createDynamoDbInstance();

      await dynamodb.updateItem(params).promise();
    };

    await Promise.all([
      addSampleIdToProjects(),
      addSampleToSamples(),
    ]);

    return OK();
  }

  async deleteSamplesEntry(projectUuid, experimentId, sampleUuids) {
    logger.log(`Deleting samples entry for project ${projectUuid} and expId ${experimentId}`);

    const allSamples = await undefinedIfNotFound(
      this.getSamplesByExperimentId(experimentId),
    ) || {};

    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const dynamodbParams = {
      TableName: this.samplesTableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();

    const promises = [];

    try {
      promises.push(await dynamodb.deleteItem(dynamodbParams).send());
    } catch (e) {
      if (e.statusCode === 404) throw new NotFoundError('Project not found');
      throw e;
    }

    if (sampleUuids.length) {
      promises.push(await this.deleteSamplesFromS3(projectUuid, sampleUuids, allSamples));
    }

    await Promise.all(promises);

    return OK();
  }

  getS3UploadUrl(projectUuid, sampleUuid, fileName, cellrangerVersion) {
    const params = {
      Bucket: this.sampleFilesBucketName,
      Key: `${projectUuid}/${sampleUuid}/${fileName}`,
      // 1 hour timeout of upload link
      Expires: 3600,
    };

    if (cellrangerVersion) {
      params.Metadata = {
        cellranger_version: cellrangerVersion,
      };
    }

    const signedUrl = getSignedUrl('putObject', params);

    return signedUrl;
  }


  getS3DownloadUrl(projectUuid, sampleUuid, fileName) {
    const params = {
      Bucket: this.sampleFilesBucketName,
      Key: `${projectUuid}/${sampleUuid}/${fileName}`,
    };

    const signedUrl = getSignedUrl('getObject', params);

    return signedUrl;
  }

  async deleteSamplesFromS3(projectUuid, samplesToRemoveUuids, allSamples) {
    const s3 = new AWS.S3();

    const sampleObjectsToDelete = samplesToRemoveUuids.map((sampleUuid) => {
      const fileKeysToDelete = Object.keys(allSamples[sampleUuid].files);

      return fileKeysToDelete.map((fileKey) => ({ Key: `${projectUuid}/${sampleUuid}/${fileKey}` }));
    });

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
}

module.exports = SamplesService;
