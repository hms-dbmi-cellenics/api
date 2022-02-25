/**
 * Per RFC7231 (https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1):
 *
 * The 500 (Internal Server Error) status code indicates that the server
 * encountered an unexpected condition that prevented it from fulfilling
 * the request.
 *
 */

class InternalServerError extends Error {
  constructor(message) {
    super(message);
    this.status = 500;
  }
}

module.exports = InternalServerError;
