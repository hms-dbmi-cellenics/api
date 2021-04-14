
const asyncTimer = (timeout) => new Promise(
  (resolve) => setTimeout(() => resolve(), timeout),
);

module.exports = asyncTimer;
