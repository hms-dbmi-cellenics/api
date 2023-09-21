const handleWorkRequest = require('./handleWorkRequest');
const getLogger = require('../../utils/getLogger');

const logger = getLogger();

module.exports = (socket) => {
  socket.on('WorkRequest-v2', async (data) => {
    logger.log(`[REQ ??, SOCKET ${socket.id}] Work submitted from client.`);
    logger.log(`[REQ ??, SOCKET ${socket.id}] ${JSON.stringify(data, null, 2)}`);

    await handleWorkRequest(socket, data);
  });
};
