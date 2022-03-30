const authenticationMiddlewareExpress = async () => (req, res, next) => {
  next();
};
const expressAuthorizationMiddleware = async (req, res, next) => {
  next();
};
const expressAuthenticationOnlyMiddleware = async (req, res, next) => {
  next();
};

const checkAuthExpiredMiddleware = async (req, res, next) => {
  next();
};

const authenticationMiddlewareSocketIO = async () => true;
const authorize = async () => true;

module.exports = {
  authenticationMiddlewareExpress,
  authenticationMiddlewareSocketIO,
  expressAuthorizationMiddleware,
  expressAuthenticationOnlyMiddleware,
  checkAuthExpiredMiddleware,
  authorize,
};
