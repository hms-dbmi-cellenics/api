class MethodNotAllowedError extends Error {
  constructor(message) {
    super(message);
    this.status = 405;
  }
}

module.exports = MethodNotAllowedError;
