const getLogger = require('../getLogger');

const logger = getLogger();

const ALL = 'all';
class hookRunner {
  constructor() {
    this.hooks = {};
    this.results = {};
    // list in the format of <step name>: [<hooks>]
    this.executedHooks = { [ALL]: [] };
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
    console.log(`running payload ${taskName}`);
    console.log(payload);


    // Manual looping is done to prevent passing function in hooks[taskName] into a callback,
    // which might cause scoping issues

    // Runs task specific hooks
    const executeHooks = async (task, all = false) => {
      const currentHooks = all ? ALL : task;
      if (this.hooks[currentHooks]) {
        this.executedHooks[task] = [];
        for (let i = 0; i < this.hooks[currentHooks].length; i += 1) {
        // calling the hooks sequentially since they may depend on each other
          // eslint-disable-next-line no-await-in-loop
          this.results[task].push(await this.hooks[currentHooks][i](payload));
        }
        if (all) {
          this.executedHooks[ALL].push({ taskName: 'executed' });
        } else {
          this.executedHooks[task].push('executed');
        }
      }
    };

    // check if the hooks already ran for this step
    if (!this.executedHooks[taskName]) {
      await executeHooks(taskName);
    }
    // Runs hooks that apply to all tasks (assigning the results to current task)
    if (!this.executedHooks[ALL].includes(taskName)) {
      await executeHooks(taskName, true);
    }
    logger.log(`Completed ${this.results[taskName].length} hooks for pipeline task ${taskName}`);

    return this.results;
  }
}

module.exports = hookRunner;
