const NotFoundError = require('./NotFoundError');
const UnauthenticatedError = require('./UnauthenticatedError');
const UnauthorizedError = require('./UnauthorizedError');
const OK = require('./OK');

module.exports = {
  UnauthenticatedError,
  UnauthorizedError,
  NotFoundError,
  OK,
};
