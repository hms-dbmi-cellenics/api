module.exports = (timeoutInMillis) => new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error(`Timeout reached: ${timeoutInMillis} ms`));
  }, timeoutInMillis);
});
