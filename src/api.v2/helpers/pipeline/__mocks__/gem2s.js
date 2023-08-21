const startGem2sPipeline = jest.fn();
const handleGem2sResponse = jest.fn();
const { runGem2s } = jest.requireActual('../gem2s.js');

module.exports = {
  startGem2sPipeline,
  handleGem2sResponse,
  runGem2s,
};
