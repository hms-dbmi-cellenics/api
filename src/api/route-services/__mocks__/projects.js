const { NotFoundError, OK } = require('../../../utils/responses');

const mockUpdateProject = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknownProjectUuid') {
    throw new NotFoundError('Project not found');
  }

  resolve(OK());
}));

const mock = jest.fn().mockImplementation(() => ({
  updateProject: mockUpdateProject,
}));

module.exports = mock;
