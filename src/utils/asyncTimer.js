
const asyncTimer = (timeout, body = 'OK') => new Promise(
  (resolve) => setTimeout(() => resolve(body), timeout),
);

module.exports = asyncTimer;
