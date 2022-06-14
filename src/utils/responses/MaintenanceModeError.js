class MaintenanceModeError extends Error {
  constructor(message) {
    super(message);
    this.status = 503;
  }
}

module.exports = MaintenanceModeError;
