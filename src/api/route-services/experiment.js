const _ = require('lodash');

const jsonMerger = require('json-merger');
const config = require('../../config');
const AWS = require('../../utils/requireAWS');
const getLogger = require('../../utils/getLogger');
const { OK, NotFoundError, BadRequestError } = require('../../utils/responses');

const safeBatchGetItem = require('../../utils/safeBatchGetItem');
const { getSignedUrl } = require('../../utils/aws/s3');

const constants = require('../general-services/pipeline-manage/constants');
const downloadTypes = require('../../utils/downloadTypes');

const {
  getExperimentAttributes,
  getDeepAttrsUpdateParams,
  getShallowAttrsUpdateParams,
} = require('./experimentHelpers');

const {
  createDynamoDbInstance,
  convertToJsObject,
  convertToDynamoDbRecord,
  convertToDynamoUpdateParams,
} = require('../../utils/dynamoDb');

const logger = getLogger('[ExperimentService] - ');

class ExperimentService {
  constructor() {
    this.experimentsTableName = `experiments-${config.clusterEnv}`;
    this.cellSetsBucketName = `cell-sets-${config.clusterEnv}`;
    this.processedMatrixBucketName = `processed-matrix-${config.clusterEnv}`;
    this.rawSeuratBucketName = `biomage-source-${config.clusterEnv}`;
    this.filteredCellsBucketName = `biomage-filtered-cells-${config.clusterEnv}`;
  }

  async getExperimentData(experimentId) {
    logger.log(`GET experiment ${experimentId} data`);

    const data = await getExperimentAttributes(this.experimentsTableName, experimentId,
      ['projectId', 'meta', 'experimentId', 'experimentName', 'sampleIds', 'notifyByEmail']);
    return data;
  }

  async getListOfExperiments(experimentIds) {
    logger.log(`GET list of experiments ${experimentIds}`);

    const dynamodb = createDynamoDbInstance();

    const params = {
      RequestItems: {
        [this.experimentsTableName]: {
          Keys: experimentIds.map((experimentId) => convertToDynamoDbRecord({ experimentId })),
        },
      },
    };

    try {
      const response = await safeBatchGetItem(dynamodb, params);

      return response.Responses[this.experimentsTableName].map(
        (experiment) => convertToJsObject(experiment),
      );
    } catch (e) {
      if (e.statusCode === 400) throw new NotFoundError('Experiments not found');
      throw e;
    }
  }


  async createExperiment(experimentId, body, user) {
    logger.log(`Creating experiment ${experimentId}`);

    const dynamodb = createDynamoDbInstance();
    const key = convertToDynamoDbRecord({ experimentId });

    const documentClient = new AWS.DynamoDB.DocumentClient();

    const rbacCanWrite = Array.from(new Set([config.adminArn, user.sub]));

    const marshalledData = convertToDynamoDbRecord({
      ':experimentName': body.experimentName,
      ':createdDate': body.createdDate,
      ':lastViewed': body.lastViewed,
      ':projectId': body.projectId,
      ':description': body.description,
      ':input': body.input,
      ':organism': body.organism,
      ':rbac_can_write': documentClient.createSet(rbacCanWrite),
      ':meta': body.meta || {},
      ':processingConfig': {},
      ':sampleIds': body.sampleIds,
      ':notifyByEmail': true,
    });

    const params = {
      TableName: this.experimentsTableName,
      Key: key,
      UpdateExpression: `SET experimentName = :experimentName,
                          createdDate = :createdDate,
                          lastViewed = :lastViewed,
                          projectId = :projectId,
                          description = :description,
                          meta = :meta,
                          processingConfig = :processingConfig,
                          sampleIds = :sampleIds,
                          rbac_can_write = :rbac_can_write,
                          notifyByEmail = :notifyByEmail`,
      ExpressionAttributeValues: marshalledData,
      ConditionExpression: 'attribute_not_exists(#experimentId)',
      ExpressionAttributeNames: { '#experimentId': 'experimentId' },
      ReturnValues: 'ALL_NEW',
    };

    await dynamodb.updateItem(params).promise();

    return OK();
  }

  async deleteExperiment(experimentId) {
    logger.log(`DELETE experiment ${experimentId}`);

    await Promise.all([
      this.deleteExperimentEntryFromDynamodb(experimentId),
      this.deleteFilteredCellsEntryFromS3(experimentId),
    ]);

    return OK();
  }

  async updateExperiment(experimentId, body) {
    logger.log(`UPDATE experiment ${experimentId} in dynamodb`);
    const dynamodb = createDynamoDbInstance();
    const {
      updateExpressionList: deepPropsUpdateExprList,
      attributeValues: deepPropsAttrValues,
      attributeNames: deepPropsAttrNames,
    } = getDeepAttrsUpdateParams(body);

    const {
      updateExpressionList: shallowPropsUpdateExprList,
      attributeValues: shallowPropsAttrValues,
    } = getShallowAttrsUpdateParams(body);

    const updateExpression = [...deepPropsUpdateExprList, ...shallowPropsUpdateExprList];
    const expressionAttributeValues = _.merge(deepPropsAttrValues, shallowPropsAttrValues);
    const params = {
      TableName: this.experimentsTableName,
      Key: convertToDynamoDbRecord({ experimentId }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'UPDATED_NEW',
    };

    if (Object.keys(deepPropsAttrNames).length) {
      params.ExpressionAttributeNames = deepPropsAttrNames;
    }

    const data = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(data.Attributes);

    return prettyData;
  }

  async getExperimentPermissions(experimentId) {
    logger.log(`GET permissions for experiment ${experimentId}`);

    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['experimentId', 'rbac_can_write']);
    return data;
  }

  async getProcessingConfig(experimentId) {
    logger.log(`GET processing config for experiment ${experimentId}`);

    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['processingConfig']);
    return data;
  }

  async getPipelinesHandles(experimentId) {
    logger.log(`GET pipelines handles for experiment ${experimentId}`);

    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['meta']);

    return {
      [constants.QC_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
        ...data.meta[constants.OLD_QC_NAME_TO_BE_REMOVED],
      },
      [constants.GEM2S_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
        ...data.meta[constants.GEM2S_PROCESS_NAME],
      },
    };
  }

  async getAttributesToCreateQCPipeline(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId, ['processingConfig', 'sampleIds']);
    return data;
  }

  async getCellSets(experimentId) {
    logger.log(`GET cell sets in s3 for experiment ${experimentId}`);

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
        throw new NotFoundError(`Couldn't find s3 cell sets bucket with key: ${experimentId}`);
      }

      throw e;
    }
  }

  async updateCellSets(experimentId, cellSetData) {
    logger.log(`UPDATE cell sets in s3 for experiment ${experimentId}`);

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

  async patchCellSets(experimentId, patch) {
    const cellSetsObject = await this.getCellSets(experimentId);
    const { cellSets: cellSetsList } = cellSetsObject;

    /**
     * The $remove operation will replace the element in the array with an
     * undefined value. We will therefore remove this from the array.
     *
     * We use the $remove operation in the worker to update cell clusters,
     * and we may end up using it in other places in the future.
     */
    const patchedArray = jsonMerger.mergeObjects(
      [cellSetsList, patch],
    ).filter((x) => x !== undefined);

    const response = await this.updateCellSets(experimentId, patchedArray);

    return response;
  }

  async updateProcessingConfig(experimentId, processingConfig) {
    return this.updatePropertyFromDiff(experimentId, 'processingConfig', processingConfig);
  }

  // Updates each sub attribute separately for
  // one particular attribute (of type object) of a dynamodb entry
  async updatePropertyFromDiff(experimentId, attributeKey, diff) {
    logger.log(`UPDATE attribute ${attributeKey} for experiment ${experimentId} with diff ${diff}`);

    const dynamodb = createDynamoDbInstance();

    let key = { experimentId };
    key = convertToDynamoDbRecord(key);

    const emptyAttributeParams = {
      TableName: this.experimentsTableName,
      Key: { experimentId: { S: experimentId } },
      UpdateExpression: `SET ${attributeKey} = if_not_exists(${attributeKey}, :updatedObject)`,
      ExpressionAttributeValues: { ':updatedObject': { M: {} } },
      ReturnValues: 'UPDATED_NEW',
    };

    await dynamodb.updateItem(emptyAttributeParams).promise();

    const {
      updExpr,
      attrNames,
      attrValues,
    } = convertToDynamoUpdateParams(attributeKey, diff);

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
    logger.log(`Saving handle ${handle} for service ${service} for experiment ${experimentId}`);

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

  async downloadData(experimentId, downloadType) {
    logger.log(`Providing download link for download ${downloadType} for experiment ${experimentId}`);

    let objectKey = '';
    let bucket = '';
    let downloadedFileName = '';

    if (!Object.values(downloadTypes).includes(downloadType)) throw new BadRequestError('Invalid download type requested');

    const { projectId } = await getExperimentAttributes(this.experimentsTableName, experimentId, ['projectId']);
    const filenamePrefix = projectId.split('-')[0];

    // Also defined in UI repo in utils/downloadTypes
    // eslint-disable-next-line default-case
    switch (downloadType) {
      case downloadTypes.PROCESSED_SEURAT_OBJECT:
        bucket = this.processedMatrixBucketName;
        objectKey = `${experimentId}/r.rds`;
        downloadedFileName = `${filenamePrefix}_processed_matrix.rds`;
        break;
      case downloadTypes.RAW_SEURAT_OBJECT:
        bucket = this.rawSeuratBucketName;
        objectKey = `${experimentId}/r.rds`;
        downloadedFileName = `${filenamePrefix}_raw_matrix.rds`;
        break;
    }

    const params = {
      Bucket: bucket,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename ="${downloadedFileName}"`,
      Expires: 120,
    };

    const signedUrl = getSignedUrl('getObject', params);

    return signedUrl;
  }

  async deleteExperimentEntryFromDynamodb(experimentId) {
    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const dynamoParams = {
      TableName: this.experimentsTableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();

    try {
      await dynamodb.deleteItem(dynamoParams).send();
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError(`Experiment not found in ${this.experimentsTableName}`);
      throw e;
    }
  }

  async deleteFilteredCellsEntryFromS3(experimentId) {
    const s3 = new AWS.S3();

    const s3Params = {
      Bucket: this.filteredCellsBucketName,
      Key: experimentId,
    };

    const result = await s3.deleteObject(s3Params).promise();

    if (result.Errors && result.Errors.length) {
      throw Error(`Delete S3 object errors: ${JSON.stringify(result.Errors)}`);
    }
  }
}

module.exports = ExperimentService;
