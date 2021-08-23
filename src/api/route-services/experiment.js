const _ = require('lodash');

const jsonMerger = require('json-merger');
const config = require('../../config');
const AWS = require('../../utils/requireAWS');
const logger = require('../../utils/logging');
const { OK, NotFoundError, BadRequestError } = require('../../utils/responses');
const safeBatchGetItem = require('../../utils/safeBatchGetItem');
const constants = require('../general-services/pipeline-manage/constants');
const downloadTypes = require('../../utils/downloadTypes');

const mockData = require('./mock-data.json');

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

class ExperimentService {
  constructor() {
    this.experimentsTableName = `experiments-${config.clusterEnv}`;
    this.cellSetsBucketName = `cell-sets-${config.clusterEnv}`;
    this.processedMatrixBucketName = `processed-matrix-${config.clusterEnv}`;
    this.rawSeuratBucketName = `biomage-source-${config.clusterEnv}`;

    mockData.matrixPath = mockData.matrixPath.replace('BUCKET_NAME', this.rawSeuratBucketName);
    this.mockData = convertToDynamoDbRecord(mockData);
  }

  async getExperimentData(experimentId) {
    const data = await getExperimentAttributes(this.experimentsTableName, experimentId,
      ['projectId', 'meta', 'experimentId', 'experimentName', 'sampleIds']);
    return data;
  }

  async getListOfExperiments(experimentIds) {
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
    const dynamodb = createDynamoDbInstance();
    const key = convertToDynamoDbRecord({ experimentId });

    const documentClient = new AWS.DynamoDB.DocumentClient();

    const rbacCanWrite = Array.from(new Set([config.adminArn, user.sub]));

    const marshalledData = convertToDynamoDbRecord({
      ':experimentName': body.name,
      ':createdDate': body.createdDate,
      ':lastViewed': body.lastViewed,
      ':projectId': body.projectUuid,
      ':description': body.description,
      ':input': body.input,
      ':organism': body.organism,
      ':rbac_can_write': documentClient.createSet(rbacCanWrite),
      ':meta': {},
      ':processingConfig': {},
      ':sampleIds': body.sampleIds,
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
                          rbac_can_write = :rbac_can_write`,
      ExpressionAttributeValues: marshalledData,
      ConditionExpression: 'attribute_not_exists(#experimentId)',
      ExpressionAttributeNames: { '#experimentId': 'experimentId' },
      ReturnValues: 'ALL_NEW',
    };

    await dynamodb.updateItem(params).promise();

    return OK();
  }

  async deleteExperiment(experimentId) {
    logger.log(`Deleting experiment ${experimentId}`);

    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const params = {
      TableName: this.experimentsTableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();

    try {
      await dynamodb.deleteItem(params).send();
      return OK();
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError('Experiment not found');
      throw e;
    }
  }

  async updateExperiment(experimentId, body) {
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

  async patchCellSets(experimentId, patch) {
    const cellSetsObject = await this.getCellSets(experimentId);
    const { cellSets: cellSetsList } = cellSetsObject;

    /**
     * The $remove operation will replace the element in the array with an
     * undefined value. We will therefore remove this from the array.
     */
    const patchedArray = jsonMerger.mergeObjects(
      [cellSetsList, patch],
    ).filter((x) => x !== undefined);

    console.log(patchedArray);
    console.log(typeof patchedArray);

    const response = await this.updateCellSets(experimentId, patchedArray);

    return response;
  }

  async updateProcessingConfig(experimentId, processingConfig) {
    return this.updatePropertyFromDiff(experimentId, 'processingConfig', processingConfig);
  }

  // Updates each sub attribute separately for
  // one particular attribute (of type object) of a dynamodb entry
  async updatePropertyFromDiff(experimentId, attributeKey, diff) {
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


    const s3 = new AWS.S3();

    const params = {
      Bucket: bucket,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename ="${downloadedFileName}"`,
      Expires: 120,
    };

    const signedUrl = s3.getSignedUrl('getObject', params);
    return { signedUrl };
  }
}

module.exports = ExperimentService;
