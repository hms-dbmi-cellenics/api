const handleWorkRequest = require('../events/handleWorkRequest');

const submitWork = async (req, res) => {
  const response = await handleWorkRequest(req.body);

  res.json({ data: response });
};

module.exports = { submitWork };
