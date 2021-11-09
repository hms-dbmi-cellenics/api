const getLogger = require('../getLogger');

const logger = getLogger();

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

  // run requires taskName to be present as a key in the payload
  async run(payload) {
    const { taskName } = payload;
    console.log(`running payload ${taskName}`);
    console.log(payload);
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
