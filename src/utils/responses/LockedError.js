class LockedError extends Error {
  constructor(message) {
    super(message);
    this.status = 423;
  }
}

module.exports = LockedError;
