/**
 * Per RFC7235 (https://datatracker.ietf.org/doc/html/rfc7235#section-3.1):
 *
 * The 401 (Unauthorized) status code indicates that the request has not
 * been applied because it lacks valid authentication credentials for
 * the target resource.
 *
 */

class UnauthentiicatedError extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
  }
}

module.exports = UnauthentiicatedError;
