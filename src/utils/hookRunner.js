class hookRunner {
  constructor() {
    this.hooks = {};
    this.results = {};
  }

  register(taskName, callback) {
    if (this.hooks[taskName] === undefined) this.hooks[taskName] = [];
    this.hooks[taskName].push(callback);
    this.results[taskName] = [];
  }

  async run(taskName, payload) {
    if (this.hooks[taskName] === undefined
      || this.hooks[taskName].length === 0
    ) { return null; }

    // Manual looping is done to prevent passing function in hooks[taskName] into a callback
    for (let idx = 0; idx < this.hooks[taskName].length; idx += 1) {
      if (this.hooks[taskName][idx].constructor.name === 'AsyncFunction') {
        // eslint-disable-next-line no-await-in-loop
        this.results[taskName].push(await this.hooks[taskName][idx](payload));
      }
      this.results[taskName].push(this.hooks[taskName][idx](payload));
    }

    return this.results;
  }
}

module.exports = hookRunner;
