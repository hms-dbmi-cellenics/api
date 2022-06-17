function isPromise(value) {
  return Boolean(value && typeof value.then === 'function');
}

module.exports = isPromise;
