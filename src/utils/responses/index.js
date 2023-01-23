const NotFoundError = require('./NotFoundError');
const UnauthenticatedError = require('./UnauthenticatedError');
const UnauthorizedError = require('./UnauthorizedError');
const BadRequestError = require('./BadRequestError');
const InternalServerError = require('./InternalServerError');
const MethodNotAllowedError = require('./MethodNotAllowedError');
const OK = require('./OK');

module.exports = {
  UnauthenticatedError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
  MethodNotAllowedError,
  OK,
};
