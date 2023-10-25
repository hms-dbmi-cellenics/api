const handleWorkRequest = require('../events/handleWorkRequest');

const submitWork = async (req, res) => {
  const io = req.app.get('io');

  const response = await handleWorkRequest(io.sockets, req.body);

  res.json({ data: response });
};

module.exports = { submitWork };
