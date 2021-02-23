class WorkResponseError extends Error {
  constructor(message, socketId) {
    super(message);
    this.socketId = socketId;
  }
}

module.exports = WorkResponseError;
