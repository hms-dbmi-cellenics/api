const logger = require('./logging');

class hookRunner {
  constructor() {
    this.hooks = {};
    this.results = {};
  }

  register(taskName, callback) {
    if (this.hooks[taskName] === undefined) this.hooks[taskName] = [];

    if (Array.isArray(callback)) {
      this.hooks[taskName].push(...callback);
    } else {
      this.hooks[taskName].push(callback);
    }

    this.results[taskName] = [];
  }

  async run(taskName, payload) {
    if (this.hooks[taskName] === undefined
      || this.hooks[taskName].length === 0
    ) { return null; }

    // Manual looping is done to prevent passing function in hooks[taskName] into a callback,
    // which might cause scoping issues
    for (let idx = 0; idx < this.hooks[taskName].length; idx += 1) {
      // eslint-disable-next-line no-await-in-loop
      this.results[taskName].push(await this.hooks[taskName][idx](payload));
    }
    logger.log(`Completed ${this.results[taskName].length} hooks for pipeline task ${taskName}`);

    return this.results;
  }
}

module.exports = hookRunner;
