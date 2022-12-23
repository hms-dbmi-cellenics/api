const { handleResponse } = require('../controllers/pipelineErrorController');

module.exports = {
  'pipelineError#response': [
    (req, res) => handleResponse(req, res),
  ],
};
