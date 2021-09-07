const getLogger = (prefix = '') => ({
  error: (...args) => {
    console.error(prefix, ...args);
  },
  warn: (...args) => {
    console.warn(prefix, ...args);
  },
  debug: (...args) => {
    console.debug(prefix, ...args);
  },
  log: (...args) => {
    console.log(prefix, ...args);
  },
  trace: (...args) => {
    console.trace(prefix, ...args);
  },
});

module.exports = getLogger;
