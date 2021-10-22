const getLogger = require('../getLogger');

const logger = getLogger();

const ALL = 'all';
class hookRunner {
  constructor() {
    this.hooks = {};
    this.results = {};
  }

  // register will run callback function when the taskName matches the payload
  // received by by run
  register(taskName, callbackFnList) {
    if (!Array.isArray(callbackFnList)) {
      throw new Error(`expected callbackFnList to be an array but got ${typeof (callbackFnList)}`);
    }

    if (this.hooks[taskName] === undefined) {
      this.hooks[taskName] = callbackFnList;
    } else {
      this.hooks[taskName].push(...callbackFnList);
    }
  }

  // registerAll will run the callback function for any payload received
  // the results will be assigned to each specific task though.
  registerAll(callbackFnList) {
    this.register(ALL, callbackFnList);
  }

  // run requires taskName to be present as a key in the payload
  async run(payload) {
    const { taskName } = payload;
    this.results[taskName] = [];

    // Manual looping is done to prevent passing function in hooks[taskName] into a callback,
    // which might cause scoping issues

    // Runs task specific hooks
    for (let i = 0; this.hooks[taskName] !== undefined && i < this.hooks[taskName].length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      this.results[taskName].push(this.hooks[taskName][i](payload));
    }

    // Runs hooks that apply to all tasks (assigning the results to current task)

    for (let i = 0; this.hooks[ALL] !== undefined && i < this.hooks[ALL].length; i += 1) {
      this.results[taskName].push(this.hooks[ALL][i](payload));
    }

    // Wait for the resolution of all hooks at the same time
    this.results[taskName] = await Promise.all(this.results[taskName]);
    logger.log(`Completed ${this.results[taskName].length} hooks for pipeline task ${taskName}`);

    return this.results;
  }
}

module.exports = hookRunner;
