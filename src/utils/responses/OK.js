const OK = (message) => ({
  data: {
    message: message || 'success',
    code: 200,
  },
});

module.exports = OK;
