const { OK } = require('../../utils/responses');
const handleWorkRequest = require('../events/handleWorkRequest');

const submitWork = async (req, res) => {
  const io = req.app.get('io');

  await handleWorkRequest(io.sockets, req.body);

  res.json(OK());
};

module.exports = { submitWork };
