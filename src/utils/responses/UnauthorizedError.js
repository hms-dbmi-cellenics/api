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

module.exports = UnauthorizedError;
