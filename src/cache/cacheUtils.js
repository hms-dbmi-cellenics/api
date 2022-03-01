class CacheMissError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const bypassCache = {
  set: () => { },
  get: () => undefined,
};

module.exports = { CacheMissError, bypassCache };
