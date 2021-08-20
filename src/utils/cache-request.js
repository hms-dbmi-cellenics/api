const hash = require('object-hash');
const AWSXRay = require('aws-xray-sdk');
const config = require('../config');
const CacheSingleton = require('../cache');
const logger = require('./logging');


const createObjectHash = (object) => hash.MD5(object);

const cacheGetRequest = async (
  data,
) => {
  const { sandboxId } = config;

  const key = createObjectHash({
    experimentId: data.experimentId,
    body: data.body,
    sandboxId,
    PipelineRunETag: data.PipelineRunETag,
  });

  const cache = CacheSingleton.get();
  const payload = await cache.get(key);

  // Annotate current segment as cached.
  AWSXRay.getSegment().addAnnotation('result', 'success-api-cache');

  return payload;
};

// ttl is set to 36 hours = 60*36*60 s = 129600
const cacheSetResponse = async (data, ttl = 129600) => {
  const { sandboxId } = config;

  const key = createObjectHash({
    experimentId: data.request.experimentId,
    body: data.request.body,
    sandboxId,
    PipelineRunETag: data.request.PipelineRunETag,
  });

  logger.log(`Putting data in cache under key ${key}`);

  const cache = CacheSingleton.get();
  await cache.set(key, data, ttl);
};

module.exports = { cacheGetRequest, cacheSetResponse };
