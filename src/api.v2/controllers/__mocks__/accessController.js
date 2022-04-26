const { NotFoundError } = require('../../../utils/responses');

const mockUsersList = [
  {
    name: 'Mock Admin',
    email: 'admin@example.com',
    role: 'admin',
  },
  {
    name: 'Mock User',
    email: 'user@example.com',
    role: 'owner',
  },
];

const mockGetExperimentUsers = jest.fn((req, res) => {
  const { experimentId } = req.params;

  if (experimentId === 'nonExistentExperimentId') {
    throw new NotFoundError('Experiment not found');
  }

  res.json(mockUsersList);
  return Promise.resolve();
});

module.exports = {
  getExperimentUsers: mockGetExperimentUsers,
};
