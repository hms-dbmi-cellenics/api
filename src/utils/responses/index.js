const NotFoundError = require('./NotFoundError');
const UnauthentiicatedError = require('./UnauthenticatedError');
const UnauthorizedError = require('./UnauthorizedError');
const OK = require('./OK');

module.exports = {
  UnauthentiicatedError,
  UnauthorizedError,
  NotFoundError,
  OK,
};
