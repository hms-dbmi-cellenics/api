/* eslint-disable max-classes-per-file */

/**
 * Per RFC7235 (https://datatracker.ietf.org/doc/html/rfc7235#section-3.1):
 *
 * The 401 (Unauthorized) status code indicates that the request has not
 * been applied because it lacks valid authentication credentials for
 * the target resource.
 *
 */
class UnauthenticedError extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
  }
}

/**
 * Per RFC7231 (https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.3):
 *
 * The 403 (Forbidden) status code indicates that the server understood
 * the request but refuses to authorize it. [...]
 *
 * If authentication credentials were provided in the request, the
 * server considers them insufficient to grant access.
 *
 */
class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.status = 403;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

module.exports = { UnauthenticedError, UnauthorizedError, NotFoundError };
