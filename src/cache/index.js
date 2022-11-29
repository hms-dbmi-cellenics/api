// TESTING IMAGE UPDATE - REMOVE BEFORE MERGING

/* eslint-disable no-underscore-dangle */
const _ = require('lodash');
const createMemCache = require('./mem-cache');
const createClient = require('./createClient');
const timeout = require('../utils/timeout');
const { CacheMissError, bypassCache } = require('./cache-utils');
const getLogger = require('../utils/getLogger');

const logger = getLogger();

class Cache {
  constructor(conf) {
    this.conf = conf;

    // If l1CacheSettings is defined, we will set it up.
    this.l1Cache = bypassCache;

    const { l1CacheSettings, enabled } = this.conf;

    if (!enabled) {
      logger.warn('WARNING: Caching is disabled on this run. To enable compatibility with');
      logger.warn('WARNING: cache-enabled instances, connections will be made, but getting');
      logger.warn('WARNING: and setting will be inoperative.');
    }

    if (l1CacheSettings && enabled) {
      const { size, ttl } = l1CacheSettings;

      logger.log(`Setting up L1 (in-memory) cache, size: ${size}, TTL: ${ttl}`);
      this.l1Cache = createMemCache({ size, ttl });

      if (!this.l1Cache) {
        logger.log('L1 cache could not be loaded. Bypassing...');
      }
    }


    logger.log('Now setting up Redis connections...');

    const endpoints = ['primary', 'reader'];
    const connections = endpoints.map((endpoint) => {
      const { host, port } = this.conf[endpoint];
      const { retryDelay } = this.conf;

      return createClient({
        host, port, retryDelay, endpoint,
      });
    });

    this.clients = Object.fromEntries(_.zip(endpoints, connections));

    return this;
  }


  getClientAndStatus(endpoint) {
    const client = this.clients[endpoint];
    if (!client) {
      return { status: 'invalid endpoint name', ready: false };
    }

    const { status } = client;
    return {
      client, status, ready: status === 'ready',
    };
  }

  // set value should not be used independently as it might cause cache poisoning
  async set(key, data, ttl) {
    if (ttl <= 0) return;
    const { cacheDuration, enabled } = this.conf;
    const { client, status, ready } = this.getClientAndStatus('primary');

    if (!ready) {
      logger.warn('redis:primary', `Cannot SETEX to ${key} as client is in status ${status}`);
      return;
    }

    if (!enabled) {
      logger.warn('Caching currently disabled, not setting anything.');
      return;
    }

    try {
      // IMPORTANT: the data that is set to the cache MUST be stringified,
      // because setex does not support setting objects.
      const stringifiedData = JSON.stringify(data);

      // Sigh.
      if (stringifiedData.length > 500 * 1000 * 1000) {
        throw new Error('Values over 500 MB are not stored as Redis values are limited to 512 MiB.');
      }

      await client.setex(key, ttl || cacheDuration, stringifiedData);
    } catch (error) {
      logger.error(`Cannot SETEX from ${key} as an error occurred: ${error.message}`);
    }
  }

  async _redisGet(key) {
    const { client, status, ready } = this.getClientAndStatus('primary');

    if (!ready) {
      throw new Error(`Cannot GET from ${key} as client is in status ${status}`);
    }

    let result;

    if (this.conf.redisGetTimeout) {
      result = await Promise.race([timeout(this.conf.redisGetTimeout), client.get(key)]);
    } else {
      result = await client.get(key);
    }

    if (!result) {
      throw new Error(`No value found in Redis cache under key ${key}`);
    }

    // unstringify the data
    result = JSON.parse(result);
    return result;
  }

  async get(key) {
    // IMPORTANT: the l1 cache stores /references/, not /values/, so
    // the results you get from l1 MUST be cloned so it can be modified
    // downstream without modifying the cache at a given key.
    const now = () => new Date();
    const requestDateTime = now();

    const { enabled } = this.conf;
    if (!enabled) {
      throw new CacheMissError('Caching disabled, automatic cache miss.');
    }

    const l1Result = this.l1Cache.get(key);

    if (l1Result) {
      l1Result.responseFrom = 'l1Cache';
      return _.cloneDeep(l1Result);
    }

    try {
      const response = await this._redisGet(key, this.conf);
      const cacheHitDuration = now() - requestDateTime;
      if (
        this.conf.l1CacheSettings
        && (cacheHitDuration >= this.conf.l1CacheSettings.minLatencyToStore)
      ) {
        this.l1Cache.set(key, response);
      }

      response.responseFrom = 'redis';
      return _.cloneDeep(response);
    } catch (error) {
      throw new CacheMissError(error.message);
    }
  }

  isReady() {
    let ready = true;

    Object.values(this.clients).forEach((client) => {
      ready = ready && (client.status === 'ready');
    });

    return ready;
  }
}

const CacheSingleton = (() => {
  let instance;

  const createInstance = (conf) => {
    const object = new Cache(conf);
    return object;
  };

  return {
    get: (conf) => {
      if (!instance) {
        instance = createInstance(conf);
        return instance;
      }

      if (conf && conf !== instance.conf) {
        throw new Error('The configuration specified does not match the instance configuration.');
      }

      return instance;
    },
  };
})();

module.exports = CacheSingleton;
