const handleWorkRequest = require('../events/handleWorkRequest');

const submitWork = async (req, res) => {
  const response = await handleWorkRequest(req.headers.authorization, req.body);

  if (response && response.errorCode === 'WORKER_STARTUP_TIMEOUT') {
    res.status(503).json({
      error: {
        code: 'WORKER_STARTUP_TIMEOUT',
        message: 'Worker failed to start within timeout',
      },
      data: { ETag: response.ETag, signedUrl: null },
    });
    return;
  }

  res.json({ data: response });
};

module.exports = { submitWork };
